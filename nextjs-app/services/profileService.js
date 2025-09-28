'use client';

 import api from "../apiConfig.json" 

export default  class ProfileService{
    _isLoading = false;

    get isLoading(){
        return this._isLoading;
    }

    set isLoading(data){
     this._isLoading = data
    }

    appendObjectToQueryString(url, obj) {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
            params.append(key, obj[key]);
            }
        }

        urlObj.search = params.toString();
        return urlObj.toString();
    }

     async profile(data){
        // make ajax call to get the state
        try{
           
            var url = `${api.ApiConfig.main}/${api.ApiConfig.profile.profile.url}${data.id}`;
            this.isLoading = true;
            var res =  await this.ajaxCallGet(url, api.ApiConfig.profile.profile.method);
            this.isLoading = false;

            if(res){
               return {
                user: res.user,
                error : false
               }
            }
            else{
                return  {
                res: [],
                error : false
               }
            }

        }
        catch(error){
            return {
                error: error
            }
        }
    }

    async myProfile(){
        // make ajax call to get the state
        try{
           
            var url = `${api.ApiConfig.main}/${api.ApiConfig.profile.myprofile.url}`;
            this.isLoading = true;
            var res =  await this.ajaxCallGet(url, api.ApiConfig.profile.myprofile.method);
            this.isLoading = false;

            if(res){
               return {
                user: res.user,
                error : false
               }
            }
            else{
                return  {
                res: [],
                error : false
               }
            }

        }
        catch(error){
            return {
                error: error
            }
        }
    }

    async all(data){
        // make ajax call to get the state
        try{
         
            var url = `${api.ApiConfig.main}/${api.ApiConfig.profile.list.url}`;
            this.isLoading = true;
            var mainURL =  this.appendObjectToQueryString(url, data);
            var res =  await this.ajaxCallGet(mainURL, api.ApiConfig.profile.list.method);
            this.isLoading = false;

            if(res){
               return {
                res: res.userList,
                error : false
               }
            }
            else{
                return  {
                res: [],
                error : false
               }
            }

        }
        catch(error){
            return {
                error: error
            }
        }
    }

    async ajaxCallGet(url, type){
        var res = await fetch(url, {
            credentials: 'include',
            method: type,
            headers: { 'Content-Type': 'application/json' },
        });
        return await res.json();
    }

    async ajaxCall(url, type, data){
        
        var res = await fetch(url, {
            method: type,
            body: data,
            headers: { 'Content-Type': 'application/json' }
        });

        return await res.json();
    }

    async saveMyProfile(payload){
        try{
            var url = `${api.ApiConfig.main}/bb-user/api/profile/save`;
            var res = await fetch(url, {
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
            return await res.json();
        }catch(error){
            return { error };
        }
    }


}

