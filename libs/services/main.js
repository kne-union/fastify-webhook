const fp = require('fastify-plugin');
const crypto = require('crypto');
const transform = require('lodash/transform');
const groupBy = require('lodash/groupBy');
const get = require('lodash/get');

function generateSignature(key, body) {
  // 创建 HMAC-SHA256 哈希对象
  const hmac = crypto.createHmac('sha256', key);
  // 更新哈希内容（支持字符串或 Buffer）
  hmac.update(body);
  // 生成 Base64 编码的签名
  return hmac.digest('base64');
}

module.exports = fp(async (fastify, options) => {
  const { models } = fastify[options.name];
  const { Op } = fastify.sequelize.Sequelize;

  const create = async ({ name, type, expire, userId, signatureLocation, inputLocation, shouldEncryptVerify }) => {
    if (!options.hooks[type]) {
      throw new Error(`Hook ${type} not allowed`);
    }
    return await models.client.create({
      name,
      type,
      expire,
      userId,
      signatureLocation,
      inputLocation,
      shouldEncryptVerify
    });
  };

  const detail = async ({ id }) => {
    const webhook = await models.client.findByPk(id);
    if (!webhook) {
      throw new Error('Webhook not found');
    }
    return webhook;
  };

  const list = async () => {
    const list = await models.client.findAll();
    const mapping = groupBy(
      list.map(webhook => {
        const signature = crypto
          .createHash('md5')
          .update(`${webhook.name}|${webhook.expire ? webhook.expire.getTime() : 0}`)
          .digest('hex');
        return Object.assign({}, webhook.get({ plain: true }), {
          signature
        });
      }),
      'type'
    );
    return transform(
      Object.keys(options.hooks),
      (result, type) => {
        result[type] = mapping[type] || [];
      },
      {}
    );
  };

  const invokeRecord = async ({ id, type, currentPage, perPage }) => {
    const { rows, count } = await models.invocation.findAndCountAll({
      where: id
        ? { webhookClientId: id }
        : {
            webhookClientId: { [Op.is]: null, type }
          },
      limit: perPage,
      offset: (currentPage - 1) * perPage
    });

    return {
      pageData: rows,
      totalCount: count
    };
  };

  const setStatus = async ({ id, status }) => {
    const webhook = await detail({ id });
    webhook.status = status;
    return webhook.save();
  };

  const remove = async ({ id }) => {
    const webhook = await detail({ id });
    await webhook.destroy();
  };

  const invoke = async ({ type, headers, body, rawBody, query }) => {
    //signature, input
    const list = await models.client.findAll({ where: { type } });

    if (list.length === 0) {
      throw new Error('Webhook not found');
    }

    let currentWebhook = null;
    for (const webhook of list) {
      const signature = get({ headers, body, query }, webhook.signatureLocation);
      if (webhook.expire && webhook.expire < new Date()) {
        continue;
      }
      const md5 = crypto
        .createHash('md5')
        .update(`${webhook.name}|${webhook.expire ? webhook.expire.getTime() : 0}`)
        .digest('hex');

      const shouldEncryptVerify = webhook.inputLocation === 'body' && webhook.shouldEncryptVerify;

      if (shouldEncryptVerify && generateSignature(md5, rawBody) === signature) {
        currentWebhook = webhook;
        break;
      }
      if (!shouldEncryptVerify) {
        if (md5 === signature) {
          currentWebhook = webhook;
          break;
        }
      }
    }

    const startTime = new Date();
    if (!currentWebhook) {
      await models.invocation.create({
        input: {
          headers,
          body,
          rawBody,
          query
        },
        type,
        status: 'failed',
        startTime,
        endTime: new Date()
      });
      throw new Error('Webhook not registered');
    }
    const input = { headers, body, query }[currentWebhook.inputLocation];
    try {
      const result = await options.hooks[currentWebhook.type]({ input });
      await models.invocation.create({
        input,
        type,
        result,
        webhookClientId: currentWebhook.id,
        status: 'success',
        startTime,
        endTime: new Date()
      });
      return {};
    } catch (e) {
      await models.invocation.create({
        input,
        type,
        result: e.toString(),
        webhookClientId: currentWebhook.id,
        status: 'failed',
        startTime,
        endTime: new Date()
      });
      throw e;
    }
  };

  Object.assign(fastify[options.name].services, { create, list, setStatus, remove, invoke, invokeRecord });
});
