const fp = require('fastify-plugin');
const crypto = require('crypto');
const transform = require('lodash/transform');
const groupBy = require('lodash/groupBy');
const get = require('lodash/get');

module.exports = fp(async (fastify, options) => {
  const { models } = fastify[options.name];

  const create = async ({ name, type, expire, userId }) => {
    if (!options.hooks[type]) {
      throw new Error(`Hook ${type} not allowed`);
    }
    return await models.webhook.create({
      name,
      type,
      expire,
      userId
    });
  };

  const detail = async ({ id }) => {
    const webhook = await models.webhook.findByPk(id);
    if (!webhook) {
      throw new Error('Webhook not found');
    }
    return webhook;
  };

  const list = async () => {
    const list = await models.webhook.findAll();
    const mapping = groupBy(
      list.map(item => {
        const hmac = crypto.createHmac('sha256', item.type);
        hmac.update(`${item.name}|${item.expire ? item.expire.getTime() : 0}`);
        const signature = hmac.digest('hex');
        return Object.assign({}, item.get({ plain: true }), {
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

  const invokeRecord = async ({ id }) => {
    return await models.invocation.findAll({
      where: { webhookId: id }
    });
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

  const invoke = async ({ type, headers, body, query }) => {
    //signature, input
    const list = await models.webhook.findAll({ where: { type } });

    if (list.length === 0) {
      throw new Error('Webhook not found');
    }

    let currentWebhook = null;
    for (const webhook of list) {
      const signature = get({ headers, body, query }, webhook.signatureLocation);
      const hmac = crypto.createHmac('sha256', type);
      hmac.update(`${webhook.name}|${webhook.expire ? webhook.expire.getTime() : 0}`);
      if (hmac.digest('hex') === signature) {
        currentWebhook = webhook;
        break;
      }
    }
    if (!currentWebhook) {
      throw new Error('Webhook not registered');
    }
    const input = { headers, body, query }[currentWebhook.inputLocation];
    const startTime = new Date();
    try {
      const result = await options.hooks[currentWebhook.type]({ input });
      await models.invocation.create({
        input,
        result,
        webhookId: currentWebhook.id,
        status: 'success',
        startTime,
        endTime: new Date()
      });
      return {};
    } catch (e) {
      await models.invocation.create({
        input,
        result: e.toString(),
        webhookId: currentWebhook.id,
        status: 'failed',
        startTime,
        endTime: new Date()
      });
      throw e;
    }
  };

  Object.assign(fastify[options.name].services, { create, list, setStatus, remove, invoke, invokeRecord });
});
