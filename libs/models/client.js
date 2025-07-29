module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      name: {
        type: DataTypes.STRING,
        comment: '名称，需说明调用webhook的端口的身份',
        allowNull: false
      },
      type: {
        type: DataTypes.STRING,
        comment: '在hooks中定义的webhook类型',
        allowNull: false
      },
      signatureLocation: {
        type: DataTypes.STRING,
        comment: '签名所在位置',
        allowNull: false,
        defaultValue: 'headers["x-signature"]'
      },
      inputLocation: {
        type: DataTypes.STRING,
        comment: '输入参数所在位置',
        allowNull: false,
        defaultValue: 'body'
      },
      expire: {
        type: DataTypes.DATE,
        comment: '过期时间,默认为null，不过期',
        defaultValue: null
      },
      shouldEncryptVerify: {
        type: DataTypes.BOOLEAN,
        comment: '是否加密验证',
        defaultValue: false
      },
      status: {
        type: DataTypes.ENUM('open', 'close'),
        comment: '状态',
        defaultValue: 'open'
      }
    },
    associate: ({ client }) => {
      client.belongsTo(options.getUserModel(), {
        foreignKey: 'userId',
        comment: '创建人'
      });
    },
    options: {
      comment: 'webhook调用客户端',
      indexes: [
        {
          fields: ['name', 'type', 'deleted_at'],
          unique: true
        }
      ]
    }
  };
};
