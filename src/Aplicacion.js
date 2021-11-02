const express = require('express');
const morgan = require('morgan');
const path = require('path');
const RutasUsuarios = require('./rutas/Usuarios');
const RutasSalas = require('./rutas/Salas');
const RutasCalendario = require('./rutas/Calendario');
const {pasaporteJwt} = require ('./middlewares/pasaporte');
const passport = require('passport');

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
        this.app.use(this.manejarCors);
        this.app.use(passport.initialize());
        passport.use('autenticacionjwt',pasaporteJwt);
    }
    manejarCors =(req,res,next)=>{
        res.set('Access-Control-Allow-Origin','*');
        if(req.method==='OPTIONS' && req.headers['origin'] && req.headers['access-control-request-method']){
            res.set('Access-Control-Allow-Methods','POST,DELETE,PUT');
            res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
            res.status(200).send();
            return;
        }else{
            next()
        }
    }
    enrutar = ()=>{
        const rutasUsuarios = new RutasUsuarios();
        const rutasSalas = new RutasSalas();
        const rutasCalendario = new RutasCalendario();
        this.app.use('/usuarios', rutasUsuarios.router);
        this.app.use('/salas', rutasSalas.router);
        this.app.use('/calendario',rutasCalendario.router);
    }
}

module.exports = Aplicacion;