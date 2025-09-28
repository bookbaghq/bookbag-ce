var chatDetail = {
    "chatDetail": {
        key: "chatDetail",
        transform: function (value) {
            return {
                "success": true,
                "id": value.id,
                "title": value.title,
                "session_id": value.session_id,
                "total_token_count": value.total_token_count,
                "created_at": value.created_at,
                "updated_at": value.updated_at
            };
        }
    }
};

module.exports = chatDetail;