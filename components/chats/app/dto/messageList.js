var messageList = {
    "messageList": {
        key: "messageList",
        transform: function (value) {
            var messageArray = [];
            value.forEach(function (item, index) {
                messageArray.push({
                    "id": item.id,
                    "role": item.role, // 'user' or 'assistant'
                    "content": item.content,
                    "token_count": item.token_count,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at,
                    "model_id": item.model_id,
                    "meta": item.meta ? JSON.parse(item.meta) : null
                });
            });
            return messageArray;
        }
    }
};

module.exports = messageList;