const express = require('express');
const morgan = require('morgan');
const path = require('path');
const RutasUsuarios = require('./rutas/Usuarios');

class Aplicacion{
    constructor(){
        this.app = express();
        this.setPuerto();
        this.setMiddlewares();
        this.enrutar();
    }
    setPuerto = ()=>{
        this.app.set('puerto',process.env.PORT || 5000);
    }
    iniciar = ()=>{
        this.app.listen(this.app.get('puerto'),()=>{console.log('escuchando en el puerto:'+this.app.get('puerto'))})
    }
    setMiddlewares = ()=>{
        this.app.use(morgan('dev'));
        this.app.use(express.urlencoded({extended:false}));
        this.app.use(express.json());
    }
    enrutar = ()=>{
        const rutasUsuarios = new RutasUsuarios();
        this.app.use('/usuarios',rutasUsuarios.router)
    }
}

module.exports = Aplicacion;