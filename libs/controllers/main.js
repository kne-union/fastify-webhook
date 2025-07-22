const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const userAuthenticate = options.getUserAuthenticate(),
    adminAuthenticate = options.getAdminAuthenticate();
  fastify.post(
    `${options.prefix}/create`,
    {
      onRequest: [userAuthenticate, adminAuthenticate],
      schema: {
        summary: '添加webhooks',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            expire: { type: 'string', format: 'date-time' }
          },
          required: ['name', 'type']
        }
      }
    },
    async request => {
      return services.create({ ...request.body, userId: request.userInfo.id });
    }
  );

  fastify.get(
    `${options.prefix}/list`,
    {
      onRequest: [userAuthenticate, adminAuthenticate]
    },
    async () => {
      return services.list();
    }
  );

  fastify.post(
    `${options.prefix}/set-status`,
    {
      onRequest: [userAuthenticate, adminAuthenticate],
      schema: {
        summary: '设置webhook状态',
        body: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            status: { type: 'string', enum: ['open', 'close'] }
          },
          required: ['id', 'status']
        }
      }
    },
    async request => {
      return services.setStatus(request.body);
    }
  );

  fastify.post(
    `${options.prefix}/invoke/:type`,
    {
      schema: {
        summary: '调用webhook post请求',
        params: {
          type: 'object',
          properties: {
            type: { type: 'string' }
          },
          required: ['type']
        }
      }
    },
    async request => {
      const { type } = request.params;
      return services.invoke(
        Object.assign(
          {},
          { type },
          {
            body: request.body,
            headers: request.headers,
            query: request.query
          }
        )
      );
    }
  );

  fastify.get(
    `${options.prefix}/invoke/:type`,
    {
      schema: {
        summary: '调用webhook get请求',
        params: {
          type: 'object',
          properties: {
            type: { type: 'string' }
          },
          required: ['type']
        }
      }
    },
    async request => {
      const { type } = request.params;
      return services.invoke(
        Object.assign(
          {},
          { type },
          {
            body: request.body,
            headers: request.headers,
            query: request.query
          }
        )
      );
    }
  );

  fastify.get(
    `${options.prefix}/invoke-record`,
    {
      onRequest: [userAuthenticate, adminAuthenticate],
      schema: {
        summary: '获取webhook调用记录',
        query: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            currentPage: { type: 'number', default: 1 },
            perPage: { type: 'number', default: 10 }
          },
          required: ['id']
        }
      }
    },
    async request => {
      return services.invokeRecord(request.query);
    }
  );

  fastify.post(
    `${options.prefix}/remove`,
    {
      onRequest: [userAuthenticate, adminAuthenticate],
      schema: {
        summary: '删除webhook',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    },
    async request => {
      return services.remove(request.body);
    }
  );
});
