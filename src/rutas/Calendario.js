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
            console.log('--->getPeriodo: '+JSON.stringify(periodo))
            res.status(200).json(periodo);               
        } catch (error) {
            console.log('error: '+error)
            res.statusMessage = error.msj;
            return res.status(error.code||500).send();
        }
    }
    getNoHabilitados = async(req,res)=>{
        try {            
            console.log('getNoHabilitados->del mes: ',req.params.mes);
            let dias = await DiasNoHabiles.findAll({
                where:sequelize.where(sequelize.fn('month',sequelize.col('dia')),req.params.mes)
            });

           /* let dia = await DiasNoHabiles.findAll(
                    sequelize.where(sequelize.fn('date',sequelize.col('dia')),sequelize.fn('date',req.body.dia))
                );*/
            console.log('--->getPeriodo: '+JSON.stringify(dias))
            res.status(201).json(dias);               
        } catch (error) {
            console.log('error: '+error)
            res.statusMessage = error.msj;
            return res.status(error.code||500).send();
        }        
    }
    setPeriodo = async(req,res)=>{
        try {
            console.log('--->setPeriodo->req.body:'+JSON.stringify(req.body))
            let cant = await Periodo.count();
            if(cant === 0){
                let reserva = await Periodo.create({fin:req.body.fin,inicio:req.body.inicio});
            }else{
                let prev = await Periodo.update({fin:req.body.fin, inicio:req.body.inicio},{where:{fin:{[Op.not]:null}}})
            }
            //console.log('----->reserva: '+JSON.stringify(reserva));      
            res.status(201).send({ msj: 'Período actualizado' });
        } catch (error) {
            console.log('error: '+error)
            res.statusMessage = error.msj;
            return res.status(error.code||500).send();            
        }
    }
    getEstado = async(req,res)=>{
        console.log('---->GetEstado 0')
        try {
            console.log('en getEstado',req.params);
            /*let estados = await DiasNoHabiles.findAll(
                sequelize.where(sequelize.fn('datediff',req.params.dia,sequelize.col('dia')),0)
            );*/
            let estados = await DiasNoHabiles.findAll({
                where:{dia:{
                    [Op.lt]:req.params.dia
                }}
            })
            //console.log('solicitud: ',sala)
            res.status(201).json(estados) 
        } catch (error) {
            console.log('errror: '+error)
        }
    }
    setEstado = async(req,res)=>{
        try {
            console.log('------>setEstado ->req.body: '+JSON.stringify(req.body));  
            let reserva;
            if(req.body.accion ==="i"){
                let dias = req.body.dia.trim().split(',');
                console.log('dias: ',dias)
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
        } catch (error) {
            console.log('Error-->'+error)            
        }
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