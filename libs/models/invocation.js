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
      type: {
        type: DataTypes.STRING,
        comment: '调用类型'
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
    associate: ({ invocation, client }) => {
      invocation.belongsTo(client, {
        comment: 'webhook调用端'
      });
    },
    options: {
      comment: '调用记录'
    }
  };
};
