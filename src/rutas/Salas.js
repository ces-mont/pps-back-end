const { Router } = require('express');
const path = require('path');
const { start, Salas, SolicitudesSalas, Usuarios } = require('../modelo/db');
const { Op } = require('sequelize');
const sequelize = require('sequelize');
const { autenticacionjwt } = require('../middlewares/pasaporte');
const bcrypt = require('bcrypt');
const mailer = require('../utilidades/mailer');

class RutasSalas {
    constructor() {
        this.router = Router();
        start();
        this.rutas();
    }
    getSalas = async (req, res) => {
        try {
            let salas = await Salas.findAll();
            res.status(201).json(salas)
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    getEstado = async (req, res) => {
        try {
            let turnos = await SolicitudesSalas.findAll({
                where: {
                    [Op.and]: [
                        { estado: 'CONFIRMADO' },
                        { sala: req.params.idsala },
                        sequelize.where(sequelize.fn('datediff', req.params.dia, sequelize.col('fechaAsignada')), 0)
                    ]
                }
            })
            res.status(201).json(turnos)
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    reservarSala = async (req, res) => {
        try {
            let sala = await Salas.findOne({ where: { idSala: req.body.idSala } });
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
                        usuario: req.usuario.idUser,
                        comentario: req.body.comentario,
                        materia: req.body.materia,
                        especialidad: req.body.especialidad,
                        sala: req.body.idSala,
                        estado: 'PENDIENTE',
                        fechaSolicitud: (new Date()).toJSON().slice(0, 19).replace('T', ' '),
                        fechaPedida: req.body.dia,
                        horaInicio: req.body.horaInicio,
                        horaFin: req.body.horaFin,
                        cantidadAlumnos: req.body.cantAlumnos
                    });     
                    let fechaSolicitud = (new Date()).toJSON().slice(0, 19).replace('T', ' ');
                    res.status(201).send({ msj: 'Su pedido ser?? revisado por el administrador del laboratorio, le enviaremos un mail para confirmar la reserva.' });
                } else {
                    res.status(201).send({ msj: 'El horario elegido ya posee reservas' })
                }
            } else {
                res.status(400)
            }
        } catch (error) {
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
            res.status(201).send({ msj: 'sala creada' });
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    actualizar = async (req, res) => {
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
            res.status(201).send({ msj: 'ok' });
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    eliminar = async (req, res) => {
        try {
            let borrada = Salas.destroy({ where: { idSala: req.body.idSala } })
            res.status(201).send({ msj: 'sala borrada con ??xito' });
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    resolverReserva = async (req, res) => {
        try {
            let user = await Usuarios.findAll({ where: { idUsuario: req.body.idusuario } });
            let solicitud = await SolicitudesSalas.findOne({ where: { [Op.and]: [{ estado: 'PENDIENTE' }, { idSolicitudSala: req.body.idSolicitudSala }] } });
            let peticionador = await Usuarios.findOne({where: {idUsuario: solicitud.usuario}})
            const match = await bcrypt.compare(req.body.contrasenia, user[0].contrasenia);
            if (match) {
                if (req.body.accion === 'r') {
                    if (user[0].rol === 'ADMI') {
                        if (solicitud !== null) {
                            SolicitudesSalas.update({ estado: 'CANCELADO', fechaResolucionSolicitud: (new Date()).toJSON().slice(0, 19).replace('T', ' '), }, {
                                where: { idSolicitudSala: req.body.idSolicitudSala }
                            })
                                .then(rta => {
                                    res.status(201).json({ msj: 'solicitud cancelada' })
                                })
                                .catch((err) => {
                                    res.statusMessage = err.msj || err;
                                    res.status(409).send()
                                });
                        }
                        let asunto = 'Solicitud de reserva de sala';
                        let contenido = 'Sr./Sra. '+peticionador.nombre+', su solicitud de reserva de sala de laboratorio ha sido rechazada.\n';
                        contenido += 'Motivo: '+req.body.motivo+'\nA su disposici??n. \nAdministraci??n de Laboratorios';   
                        mailer(peticionador.mail,asunto,contenido); 
                    } else {
                        res.statusMessage = 'No estas habilitado para realizar esta acci??n';
                        return res.status(401).send()
                    }
                } else if (req.body.accion === 'c') {
                    if (user[0].rol === 'ADMI') {
                        if (solicitud !== null) {
                            SolicitudesSalas.update({ estado: 'CONFIRMADO', fechaAsignada: solicitud.fechaPedida,fechaResolucionSolicitud: (new Date()).toJSON().slice(0, 19).replace('T', ' '), }, {
                                where: { idSolicitudSala: req.body.idSolicitudSala }
                            })
                                .then(rta => {
                                    res.status(201).json({ msj: 'solicitud confirmada' })
                                })
                                .catch((err) => {
                                    res.statusMessage = err.msj || err;
                                    res.status(409).send()
                                });
                        }
                        let asunto = 'Solicitud de reserva de sala';
                        let contenido = 'Sr./Sra. '+peticionador.nombre+', su solicitud de reserva de sala de laboratorio ha sido aceptada.\n';
                        contenido += 'RESERVA OTORGADA. DIA: '+solicitud.fechaPedida+' - HORARIO:'+solicitud.horaInicio+' a '+solicitud.horaFin+' )';
                        contenido += '\nA su disposici??n. \nAdministraci??n de Laboratorios';   
                        mailer(peticionador.mail,asunto,contenido); 
                        res.status(201).json({msj:'solicitud resuelta'})
                    } else {
                        res.statusMessage = 'No estas habilitado para realizar esta acci??n';
                        return res.status(401).send()
                    }
                } else {
                    return res.status(400).send();
                }
            } else {
                res.statusMessage = 'Error en el usuario o contrase??a';
                return res.status(401).send();
            }
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    getReservasPendientes = async (req, res) => {
        try {
            let pendientes = await SolicitudesSalas.findAll({ where: { estado: 'PENDIENTE' }, include: [Salas, Usuarios] });
            res.status(201).json(pendientes)
        } catch (error) {
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