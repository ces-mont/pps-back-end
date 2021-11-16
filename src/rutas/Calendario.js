const {Router} = require('express');
const path = require('path');
const { start, Accesorios, Usuarios, SolicitudesAccesorios,DiasNoHabiles,Periodo } = require('../modelo/db');
const {Op} = require('sequelize');
const sequelize = require('sequelize');
const {autenticacionjwt} = require('../middlewares/pasaporte');

class Calendario {
    constructor(){
        this.router = Router();
        start();
        this.rutas();
    }    
    getPeriodo = async(req,res)=>{
        try {            
            let periodo = await Periodo.findAll();
            res.status(200).json(periodo);               
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code||500).send();
        }
    }
    getNoHabilitados = async(req,res)=>{
        try {            
            let dias = await DiasNoHabiles.findAll({
                where:sequelize.where(sequelize.fn('month',sequelize.col('dia')),req.params.mes)
            });
            res.status(201).json(dias);               
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code||500).send();
        }        
    }
    setPeriodo = async(req,res)=>{
        try {
            let cant = await Periodo.count();
            if(cant === 0){
                let reserva = await Periodo.create({fin:req.body.fin,inicio:req.body.inicio});
            }else{
                let prev = await Periodo.update({fin:req.body.fin, inicio:req.body.inicio},{where:{fin:{[Op.not]:null}}})
            }     
            res.status(201).send({ msj: 'Período actualizado' });
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code||500).send();            
        }
    }
    getEstado = async(req,res)=>{
        try {
            let estados = await DiasNoHabiles.findAll({
                where:{dia:{
                    [Op.lt]:req.params.dia
                }}
            })
            res.status(201).json(estados) 
        } catch (error) {};
    }
    setEstado = async(req,res)=>{
        try { 
            let reserva;
            if(req.body.accion ==="i"){
                let dias = req.body.dia.trim().split(',');
                for (const it of dias) {       
                    let dia = new Date(req.body.anio,+req.body.mes-1,it)   
                    reserva = await DiasNoHabiles.create({dia:dia});
                }
                res.status(201).json(reserva) 
            }else{
                let dias = req.body.dia.trim().split(',');
                for (const it of dias){
                    let dia = new Date(req.body.anio,+req.body.mes-1,it) 
                    reserva = await DiasNoHabiles.destroy({
                        where:{
                            [Op.and]:[
                                {dia:dia}
                            ]
                        }
                    });
                }
                res.status(201).json(reserva) 
            }
        } catch (error) {};
    }
    rutas(){
        this.router.get('/periodo',this.getPeriodo);
        this.router.get('/diasinhabilitados/:mes',this.getNoHabilitados);
        this.router.get('/estado/:dia',autenticacionjwt,this.getEstado);
        this.router.post('/estado/',autenticacionjwt,this.setEstado);
        this.router.post('/periodo',autenticacionjwt,this.setPeriodo);
    }
}

module.exports = Calendario;