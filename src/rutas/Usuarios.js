const {Router} = require('express');
const {start,Usuarios} = require('../modelo/db');

class RutasUsuarios {
    constructor(){
        this.router = Router();
        start();
        this.enrutar()
    } 
    login = (req,res)=>{
        try {
            console.log('POST->/LOGIN/USUARIO1: ')
            return res.status(201).send();
        } catch (error) {
            console.log('Error->'+error.msj);
            res.statusMessage = error.msj;
            return res.status(error.code||500).send();
        }
    }
    holis = (req,res)=>{
        console.log("holis-->");
        return res.status(200).send();
    }
    enrutar(){
        this.router.post('/login',this.login)
        this.router.get('/',this.holis)
    }
}
module.exports = RutasUsuarios;