const {Router} = require('express');
const {start,Usuarios} = require('../modelo/db');
const jwt = require ('jsonwebtoken');
const bcrypt = require('bcrypt');

class RutasUsuarios {
    constructor(){
        this.router = Router();
        start();
        this.enrutar()
    } 
    login = async (req,res)=>{
        try {
            var usuario = await Usuarios.findOne({where:{nombre:req.body.nombre}});
            bcrypt.compare(req.body.contrasenia, usuario.contrasenia, (err,rta)=>{
                if(rta){
                    if(err) throw err;
                    return res.status(201).json({
                        token: this.crearToken(usuario.idUsuario,usuario.rol),
                        nombre:usuario.nombre,
                        apellido:usuario.apellido,
                        rol:usuario.rol,
                        idUsuario:usuario.idUsuario
                    });
                }else{
                    res.statusMessage = 'Error en el usuario o contraseña';
                    return res.status(401).send();
                }
            })
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code||500).send();
        }
    }
    crearToken = (iduser,rol)=>{
        return jwt.sign({id:iduser,rol:rol}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_LIFETIME});
    }
    enrutar(){
        this.router.post('/login',this.login)
    }
}
module.exports = RutasUsuarios;