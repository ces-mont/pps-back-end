const {ExtractJwt} = require('passport-jwt');
const StrategyJwt = require('passport-jwt').Strategy;
const passport = require('passport');
const {start,Usuarios} = require('../modelo/db');

// Inicializando passport y seteando la callback de verificacion
var opts={};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.JWT_SECRET;

const callbackVerificacion = async (jwtPayload,done)=>{ 
    start();
    let user = await Usuarios.findOne({where:{idUsuario:jwtPayload.id}});
    done(null,true,{usuario:{idUser:jwtPayload.id,rol:jwtPayload.rol}});
}
const pasaporteJwt = new StrategyJwt(opts,callbackVerificacion);

// Authentication callback:
const autenticacionjwt = (req,res,next) => {
    passport.authenticate('autenticacionjwt', {session:false},(err,encontrado,user)=>{
        if (err) { return next(err); }
        if(!encontrado){
            let error = new Error();
            error.code = 401;
            error.message = 'Error en el loggeo';
            next(error);
        }else{
            req.usuario = user.usuario;
            next();
        }     
    })(req,res,next)
};

module.exports = {pasaporteJwt, autenticacionjwt}