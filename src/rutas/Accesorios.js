const { Router } = require('express');
const { start, Accesorios, SolicitudesAccesorios, Usuarios } = require('../modelo/db');
const { Op } = require('sequelize');
const sequelize = require('sequelize');
const { autenticacionjwt } = require('../middlewares/pasaporte');
const bcrypt = require('bcrypt');
const mailer = require('../utilidades/mailer');

class RutasAccesorios {
    constructor() {
        this.router = Router();
        start();
        this.rutas();
    }
    getAccesorios = async (req, res) => {
        try {
            let accs = await Accesorios.findAll();
            res.status(201).json(accs)
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    getEstado = async (req, res) => {
        try {
            let turnos = await SolicitudesAccesorios.findAll({
                where: {
                    [Op.and]: [
                        { estado: 'CONFIRMADO' },
                        { accesorio: req.params.idAccesorio },
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
    reservarAccesorio = async (req, res) => {
        try {
            let accs = await Accesorios.findOne({ where: { idAccesorio: req.body.idAccesorio } });
            if (accs.length !== 0) {
                let reservas = await SolicitudesAccesorios.findAll({
                    where: {
                        [Op.and]: [{ accesorio: req.body.idAccesorio }, sequelize.where(sequelize.fn('date', sequelize.col('fechaAsignada')), sequelize.fn('date', req.body.dia)),
                        {
                            [Op.or]: [{ [Op.and]: [{ horaInicio: { [Op.gte]: req.body.horaInicio } }, { horaInicio: { [Op.lt]: req.body.horaFin } }] },
                            { [Op.and]: [{ horaFin: { [Op.gte]: req.body.horaInicio } }, { horaFin: { [Op.lt]: req.body.horaFin } }] }
                            ]
                        }
                        ]
                    },
                });
                if (reservas.some(e => { return (+accs.cantidad - e.cantidad - req.body.cantidad < 0) })) {
                    res.status(500).send({ msj: 'El dispositivo no tiene disponibilidad en el horario elegido' })
                } else {
                    let reserva = await SolicitudesAccesorios.create({
                        usuario: req.usuario.idUser,
                        comentario: req.body.comentario,
                        materia: req.body.materia,
                        especialidad: req.body.especialidad,
                        accesorio: req.body.idAccesorio,
                        estado: 'PENDIENTE',
                        fechaSolicitud: (new Date()).toJSON().slice(0, 19).replace('T', ' '),
                        fechaPedida: req.body.dia,
                        horaInicio: req.body.horaInicio,
                        horaFin: req.body.horaFin,
                        cantidad: req.body.cantidad
                    });     
                    let fechaSolicitud = (new Date()).toJSON().slice(0, 19).replace('T', ' ');
                    res.status(201).send({ msj: 'Su pedido será revisado por el administrador del laboratorio, le enviaremos un mail para confirmar la reserva.' });
                }
            } else {
                res.status(400)
            }
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    crearAccesorio = async (req, res) => {
        try {
            let accs = await Accesorios.create({
                descripcionCorta: req.body.descripcionCorta,
                descripcionLarga: req.body.descripcionLarga,
                tipo: req.body.tipo,
                cantidad: req.body.cantidad,
                urlImagen: req.body.urlImagen
            });
            res.status(201).send({ msj: 'accesorio creado' });
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    actualizar = async (req, res) => {
        try {
            let resultado = await Accesorios.update({
                tipo: req.body.tipo,
                descripcionLarga: req.body.descripcionLarga,
                descripcionCorta: req.body.descripcionCorta,
                cantidad: req.body.cantidad,
                urlImagen: req.body.urlImagen
            }, {
                where: {
                    idAccesorio: req.body.idAccesorio
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
            let borrado = Accesorios.destroy({ where: { idSala: req.body.idAccesorio } })
            res.status(201).send({ msj: 'accesorio borrado con éxito' });
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    resolverReserva = async (req, res) => {
        try {
            let user = await Usuarios.findAll({ where: { idUsuario: req.body.idusuario } });
            let solicitud = await SolicitudesAccesorios.findOne({ where: { [Op.and]: [{ estado: 'PENDIENTE' }, { idSolicitudAccesorio: req.body.idSolicitudAccesorio }] } });
            let peticionador = await Usuarios.findOne({ where: { idUsuario: solicitud.usuario } })
            const match = await bcrypt.compare(req.body.contrasenia, user[0].contrasenia);
            if (match) { 
                if (req.body.accion === 'r') {
                    if (user[0].rol === 'ADMI') {
                        if (solicitud !== null) {
                            SolicitudesAccesorios.update({ estado: 'CANCELADO', fechaResolucionSolicitud: (new Date()).toJSON().slice(0, 19).replace('T', ' '), }, {
                                where: { idSolicitudAccesorio: req.body.idSolicitudAccesorio}
                            })
                                .then(rta => {
                                    res.status(201).json({ msj: 'solicitud cancelada' })
                                })
                                .catch((err) => {
                                    res.statusMessage = err.msj || err;
                                    res.status(409).send()
                                });
                        }
                        let asunto = 'Solicitud de reserva de dispositivo';
                        let contenido = 'Sr./Sra. ' + peticionador.nombre + ', su solicitud de reserva de dispositivo ha sido rechazada.\n';
                        contenido += 'Motivo: ' + req.body.motivo + '\nA su disposición. \nAdministración de Laboratorios';
                        mailer(peticionador.mail, asunto, contenido);
                    } else {
                        res.statusMessage = 'No estas habilitado para realizar esta acción';
                        return res.status(401).send()
                    }
                } else if (req.body.accion === 'c') {
                    if (user[0].rol === 'ADMI') {
                        if (solicitud !== null) {
                            SolicitudesAccesorios.update({ estado: 'CONFIRMADO', fechaAsignada: solicitud.fechaPedida, fechaResolucionSolicitud: (new Date()).toJSON().slice(0, 19).replace('T', ' '), }, {
                                where: { idSolicitudAccesorio: req.body.idSolicitudAccesorio}
                            })
                                .then(rta => {
                                    res.status(201).json({ msj: 'solicitud confirmada' })
                                })
                                .catch((err) => {
                                    res.statusMessage = err.msj || err;
                                    res.status(409).send()
                                });
                        }
                        let asunto = 'Solicitud de reserva de dispositivo';
                        let contenido = 'Sr./Sra. ' + peticionador.nombre + ', su solicitud de reserva de dispositivos ha sido aceptada.\n';
                        contenido += 'RESERVA OTORGADA. DIA: ' + solicitud.fechaPedida + ' - HORARIO:' + solicitud.horaInicio + ' a ' + solicitud.horaFin + ' )';
                        contenido += '\nA su disposición. \nAdministración de Laboratorios';
                        mailer(peticionador.mail, asunto, contenido);
                        res.status(201).json({ msj: 'solicitud resuelta' })
                    } else {
                        res.statusMessage = 'No estas habilitado para realizar esta acción';
                        return res.status(401).send()
                    }
                } else {
                    return res.status(400).send();
                }
            } else {
                res.statusMessage = 'Error en el usuario o contraseña';
                return res.status(401).send();
            }

        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    getReservasPendientes = async (req, res) => {
        try {
            let pendientes = await SolicitudesAccesorios.findAll({ where: { estado: 'PENDIENTE' }, include: [Accesorios, Usuarios] });
            res.status(201).json(pendientes)
        } catch (error) {
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    rutas() {
        this.router.get('/', this.getAccesorios);
        this.router.post('/', autenticacionjwt, this.crearAccesorio);
        this.router.put('/', autenticacionjwt, this.actualizar);
        this.router.delete('/', autenticacionjwt, this.eliminar);
        this.router.get('/estado/:idAccesorio/:dia', autenticacionjwt, this.getEstado);
        this.router.get('/reservaspendientes', autenticacionjwt, this.getReservasPendientes);
        this.router.post('/reservar', autenticacionjwt, this.reservarAccesorio);
        this.router.post('/resolverreserva', autenticacionjwt, this.resolverReserva)
    }
}

module.exports = RutasAccesorios;