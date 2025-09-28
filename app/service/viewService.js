
class viewService {
    constructor(){
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    formatDateFromTimeStamp(date) {
        var time = new Date(parseInt(date));
        var monthNames = [
          "January", "February", "March",
          "April", "May", "June", "July",
          "August", "September", "October",
          "November", "December"
        ];
      
        var day = time.getDate();
        var monthIndex = time.getMonth();
        var year = time.getFullYear();
      
        return `${monthNames[monthIndex]} ${day}, ${year}`;
      }

      getInitials(firstName, last_name){
        var name = `${firstName} ${last_name}`;
        if(name){
          var parts = name.split(' ')
          var initials = ''
          for (var i = 0; i < parts.length; i++) {
            if (parts[i].length > 0 && parts[i] !== '') {
              initials += parts[i][0]
            }
          }
          return initials
        }
        else{
          return "";
        }
    };

}

module.exports = viewService;