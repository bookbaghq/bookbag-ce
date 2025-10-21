import api from "../apiConfig.json"
const BASE = api.ApiConfig.main;

export default class Credentials {

    async register(formData){

        try{
            var url = `${BASE}/${api.ApiConfig.credentials.register.url}`;
           
            return await this.ajaxCall(url , api.ApiConfig.credentials.register.method, JSON.stringify(formData));
        }
        catch(error){
            return {
                error: error
            }
        }
    }
    

     async login(formData){

        try{

            var url = `${BASE}/${api.ApiConfig.credentials.login.url}`;
            return await this.ajaxCall(url, api.ApiConfig.credentials.login.method, JSON.stringify(formData));
        }
        catch(error){
            return {
                error: error
            }
        }
    }

     async forgetPassword(formData){

        try{
            var url = `${BASE}/${api.ApiConfig.credentials.forgetPassword.url}`;
            return await this.ajaxCall(url, api.ApiConfig.credentials.forgetPassword.method, JSON.stringify(formData));
        }
        catch(error){
            return {
                error: error
            }
        }
    }

    async changePassword(formData){

        try{
            var url = `${BASE}/${api.ApiConfig.credentials.changePassword.url}`;
            return await this.ajaxCall(url, api.ApiConfig.credentials.changePassword.method, JSON.stringify(formData));
        }
        catch(error){
            return {
                error: error
            }
        }
    }

    async ajaxCall(url, type, formData){
        var res = await fetch(url, {
                credentials: 'include',
                method: type,
                body: formData,
                headers: { 'Content-Type': 'application/json' }
            });
        return await res.json();
    }

}