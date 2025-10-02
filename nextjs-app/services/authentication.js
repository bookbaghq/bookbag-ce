'use client';

 import api from "../apiConfig.json" 
 import getBackendBaseUrl from "../lib/backendUrl";
 const BASE = getBackendBaseUrl();

 export default class Authentication{
   

    async logout(){
        // make ajax call to get the state
        try{
            var url = `${BASE}/${api.ApiConfig.credentials.logout.url}`;
            this.isLoading = true;
            var res =  await this.ajaxCall(url, api.ApiConfig.credentials.logout.method);
            this.isLoading = false;

            if(res){
                return {
                    currentUser: {
                        isAuthenticated : false,
                        isSubscriber : false,
                        isAdmin : false,
                        id : "",
                        role: ""
                    },
                    error : false
                };
            }
            else{
                return {
                    currentUser: {
                        isAuthenticated : false,
                        isSubscriber : false,
                        isAdmin : false,
                        id : "",
                        role: ""
                    },
                    error : "Error : Could not log user out"
                }
            }

        }
        catch(error){
            return {
                error: error
            }
        }
    }

    async currentUser(){
        // For development purposes, hardcode authentication values
        try {
            this.isLoading = true;
            
            var url = `${BASE}/${api.ApiConfig.auth.currentUser.url}`;
            var res =  await this.ajaxCall(url, api.ApiConfig.auth.currentUser.method);
            this.isLoading = false;

           if(res){

                return {
                        isAuthenticated : res.isAuthenticated,
                        isSubscriber : res.isSubscriber,
                        isAdmin : res.isAdmin,
                        id :  res.id,
                        role: res.role,
                        isTemp: !!res.isTemp,
                        error : false
                }
            }
            else{
               return {
                        isAuthenticated : false,
                        isSubscriber : false,
                        isAdmin : false,
                        id : "",
                        role: "",
                        error : false
                }
            }

        }
        catch(error){
            this.isLoading = false;
            return {
                error: error
            }
        }
    }

    async ajaxCall(url, type){
        
         try {
            var res = await fetch(url, {
                credentials: 'include',
                method: type,
                headers: { 'Content-Type': 'application/json' }
            });
            return await res.json();
        }catch(error){
            
            return null;
        }
    }

}


