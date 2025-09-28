
const master = require('mastercontroller');
var viewS = require(`${master.root}/app/service/viewService`);
var viewService = new viewS();

var CurrentUserVM = {
    "profileUser" : {
         key: "productUser",
         transform: function (value) { 
             
          var profileObject = {
                
                "currentUser" :{
                    id : value.user.id,
                    firstName : value.user.first_name,
                    lastName: value.user.last_name,
                    fullNameInitials : viewService.getInitials(value.user.first_name, value.user.last_name),
                    isLoggedIn : true
                }
            }
           
           return profileObject;
         }
     }
 }
 module.exports = CurrentUserVM;