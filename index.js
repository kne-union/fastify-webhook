const fp = require('fastify-plugin');
const path = require('node:path');

module.exports = fp(async (fastify, options) => {
  options = Object.assign(
    {},
    {
      prefix: '/api/webhook',
      dbTableNamePrefix: 't_',
      name: 'webhook',
      hooks: {},
      rawBodyField: 'rawBody',
      getUserAuthenticate: () => {
        if (!fastify.account) {
          throw new Error('fastify-account plugin must be registered before fastify-trtc,or set options.getUserAuthenticate');
        }
        return fastify.account.authenticate.user;
      },
      getAdminAuthenticate: () => {
        if (!fastify.account) {
          throw new Error('fastify-account plugin must be registered before fastify-trtc,or set options.getAdminAuthenticate');
        }
        return fastify.account.authenticate.admin;
      },
      getUserModel: () => {
        if (!fastify.account) {
          throw new Error('fastify-account plugin must be registered before fastify-trtc,or set options.getUserModel');
        }
        return fastify.account.models.user;
      }
    },
    options
  );

  fastify.register(require('@kne/fastify-namespace'), {
    options,
    name: options.name,
    modules: [
      ['controllers', path.resolve(__dirname, './libs/controllers')],
      [
        'models',
        await fastify.sequelize.addModels(path.resolve(__dirname, './libs/models'), {
          prefix: options.dbTableNamePrefix,
          modelPrefix: options.name,
          getUserModel: options.getUserModel
        })
      ],
      ['services', path.resolve(__dirname, './libs/services')]
    ]
  });
});
