const { Router } = require('express');
const path = require('path');
const { start, Salas, SolicitudesSalas, Usuarios } = require('../modelo/db');
const { Op } = require('sequelize');
const sequelize = require('sequelize');
const { autenticacionjwt } = require('../middlewares/pasaporte');

class RutasSalas {
    constructor() {
        this.router = Router();
        start();
        this.rutas();
    }
    getSalas = async (req, res) => {
        try {
            //console.log('LOGIN->USUARIO0: ',req)
            let salas = await Salas.findAll();
            console.log('LOGIN->USUARIO1: ' + JSON.stringify(salas))
            res.status(201).json(salas)
        } catch (error) {
            console.log('error: ' + error)
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    getEstado = async (req, res) => {
        console.log('en getEstado0 0')
        try {
            console.log('en getEstado', req.params)
            let turnos = await SolicitudesSalas.findAll({
                where: {
                    [Op.and]: [
                        { estado: 'CONFIRMADO' },
                        { sala: req.params.idsala },
                        sequelize.where(sequelize.fn('datediff', req.params.dia, sequelize.col('fechaAsignada')), 0)
                    ]
                }
            })
            //console.log('solicitud: ',sala)
            res.status(201).json(turnos)
        } catch (error) {
            console.log('errror: ' + error)
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    reservarSala = async (req, res) => {
        try {
            console.log('------>reservarSala->req.body: ' + JSON.stringify(req.body));
            console.log('------>reservarSala->req.usuario: ' + JSON.stringify(req.usuario));
            let sala = await Salas.findOne({ where: { idSala: req.body.idSala } });
            console.log('-------->Sala: ' + JSON.stringify(sala))
            if (sala.length !== 0) {
                let reservas = await SolicitudesSalas.findAll({
                    where: {
                        [Op.and]: [
                            { sala: req.body.idSala },
                            sequelize.where(sequelize.fn('date', sequelize.col('fechaAsignada')), sequelize.fn('date', req.body.dia)),
                            {
                                [Op.or]: [
                                    {
                                        [Op.and]: [
                                            { horaInicio: { [Op.gte]: req.body.horaInicio } },
                                            { horaInicio: { [Op.lt]: req.body.horaFin } }
                                        ]
                                    },
                                    {
                                        [Op.and]: [
                                            { horaFin: { [Op.gte]: req.body.horaInicio } },
                                            { horaFin: { [Op.lt]: req.body.horaFin } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                });
                if (reservas.length === 0) {
                    let reserva = await SolicitudesSalas.create({
                        usuario:req.usuario.idUser,
                        comentario:req.body.comentario,
                        materia:req.body.materia,
                        especialidad:req.body.especialidad,
                        sala:req.body.idSala,
                        estado:'PENDIENTE',
                        fechaSolicitud: (new Date()).toJSON().slice(0,19).replace('T',' '),
                        fechaPedida:req.body.dia,
                        horaInicio:req.body.horaInicio,
                        horaFin:req.body.horaFin,
                        cantidadAlumnos:req.body.cantAlumnos
                    });   
                    //console.log('----->reserva: '+JSON.stringify(reserva))        
                    let fechaSolicitud = (new Date()).toJSON().slice(0, 19).replace('T', ' ');
                    console.log('-->fechaSolicitud: ', fechaSolicitud)
                    res.status(201).send({ msj: 'Su pedido será revisado por el administrador del laboratorio, le enviaremos un mail para confirmar la reserva.' });
                } else {
                    console.log('----->Reservas: ' + JSON.stringify(reservas))
                    res.status(201).send({ msj: 'El horario elegido ya posee reservas' })
                }
            } else {
                console.log('----->Reservas: ' + JSON.stringify(reservas))
                res.status(400)
            }
        } catch (error) {
            console.log('error: ' + error);
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    crearSala = async (req, res) => {
        try {
            let sala = await Salas.create({
                descripcionCorta: req.body.descripcionCorta,
                descripcionLarga: req.body.descripcionLarga,
                tipo: req.body.tipo,
                ubicacion: req.body.ubicacion,
                urlImagen: req.body.urlImagen
            });
            console.log('POST->SALAS: ' + JSON.stringify(sala))
            res.status(201).send({ msj: 'sala creada' });
        } catch (error) {
            console.log('error: ' + error)
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    actualizar = async (req, res) => {
        console.log('PUT->/SALA -->campos: ', req.body)
        try {
            let resultado = await Salas.update({
                tipo: req.body.tipo,
                descripcionLarga: req.body.descripcionLarga,
                descripcionCorta: req.body.descripcionCorta,
                ubicacion: req.body.ubicacion,
                urlImagen: req.body.urlImagen
            }, {
                where: {
                    idSala: req.body.idSala
                }
            })
            console.log('->/SALAS/UPDATE->RTA: ', resultado);
            res.status(201).send({ msj: 'ok' });
        } catch (error) {
            console.log('error: ' + error)
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    eliminar = async (req, res) => {
        try {
            console.log('->DELETE->idSala ', req.body.idSala)
            let borrada = Salas.destroy({ where: { idSala: req.body.idSala } })
            res.status(201).send({ msj: 'sala borrada con éxito' });
        } catch (error) {
            console.log('error: ' + error)
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    resolverReserva = async (req, res) => {
        try {
            console.log('------>resolverReserva->req.body: ' + JSON.stringify(req.body));
            let solicitud = await SolicitudesSalas.findOne({where: { [Op.and]:[ {estado: 'PENDIENTE'},{idSolicitudSala: req.body.idSolicitudSala} ] }});
            console.log('------>resolverReserva->solicitud: ', solicitud);
            if (solicitud !== null) {
                if (req.body.accion === 'r') {
                    let reserva = await SolicitudesSalas.update({
                        estado: 'CANCELADO',
                        fechaResolucionSolicitud:(new Date()).toJSON().slice(0,19).replace('T',' '),
                    }, {
                        where: { idSolicitudSala: req.body.idSolicitudSala }
                    });
                    /* let asunto = 'Solicitud de reserva de sala';
                    let contenido = 'Sr./Sra. '+req.body.nombre+', su solicitud de reserva de la sala '+ req.body.nombreSala +' ha sido denegada debido a:\n';
                    contenido += req.body.motivo+'. \nA su disposición. Administración de Laboratorios';              
                    mailer(req.body.mail,asunto,contenido); */
                } else if (req.body.accion === 'c') {
                    let reserva = await SolicitudesSalas.update({
                        estado: 'CONFIRMADO',
                        fechaResolucionSolicitud:(new Date()).toJSON().slice(0,19).replace('T',' '),
                    }, {
                        where: { idSolicitudSala: req.body.idSolicitudSala }
                    })
                    /*    let asunto = 'Solicitud de reserva de sala';
                       let contenido = 'Sr./Sra. '+req.body.nombre+', su solicitud de reserva de la sala '+ req.body.nombreSala +' ha sido confirmada.\n';
                       contenido += 'Fecha y hora de reserva: '+req.body.+'. \nA su disposición. Administración de Laboratorios';              
                       mailer(req.body.mail,asunto,contenido); */
                } else {
                    return res.status(400).send();
                }
            } else {
                return res.status(400).send();
            }
            //console.log('->/SOLICITUDESSALAS/UPDATE->RTA: ',resultado);
            res.status(201).send({ msj: 'ok' });
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    getReservasPendientes = async (req, res) => {
        try {
            console.log('en getEstado')
            let pendientes = await SolicitudesSalas.findAll({ where: { estado: 'PENDIENTE' }, include: [Salas, Usuarios] });
            //console.log('getReservasPendientes->pendientes: ',pendientes)
            res.status(201).json(pendientes)
        } catch (error) {
            console.log('errror: ' + error)
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    rutas() {
        this.router.get('/', this.getSalas);
        this.router.post('/', autenticacionjwt, this.crearSala);
        this.router.put('/', autenticacionjwt, this.actualizar);
        this.router.delete('/', autenticacionjwt, this.eliminar);
        this.router.get('/estado/:idsala/:dia', autenticacionjwt, this.getEstado);
        this.router.get('/reservaspendientes', autenticacionjwt, this.getReservasPendientes);
        this.router.post('/reservar', autenticacionjwt, this.reservarSala);
        this.router.post('/resolverreserva', autenticacionjwt, this.resolverReserva)
    }
}

module.exports = RutasSalas;