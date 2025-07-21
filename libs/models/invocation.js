module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      startTime: {
        type: DataTypes.DATE,
        comment: '调用时间',
        allowNull: false
      },
      endTime: {
        type: DataTypes.DATE,
        comment: '调用结束时间',
        allowNull: false
      },
      input: {
        type: DataTypes.JSON,
        comment: '调用参数'
      },
      status: {
        type: DataTypes.ENUM('success', 'failed'),
        comment: '调用返回状态'
      },
      result: {
        type: DataTypes.JSON,
        comment: '调用结果'
      }
    },
    associate: ({ invocation, webhook }) => {
      invocation.belongsTo(webhook, {
        allowNull: false,
        comment: 'webhook'
      });
    },
    options: {
      comment: '调用记录'
    }
  };
};
