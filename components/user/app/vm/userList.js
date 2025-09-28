
const master = require('mastercontroller');
var viewS = require(`${master.root}/app/service/viewService`);
var viewService = new viewS();

var userList = {
    "userList" : {
         key: "userList",
         transform: function (value) { 
            var userArray = [];
            value.users.forEach(function (item, index) {

                var fullName = `${item.first_name ?? ''} ${item.last_name ?? ''}`;
                var userObj = {"userName" : item.user_name, "fullName": fullName, "email": item.email, "role": item.role, "id": item.id,};
                userArray.push(userObj);
              });
           
           return userArray;
         }
     }
 }
 module.exports = userList;