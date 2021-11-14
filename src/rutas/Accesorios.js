const { Router } = require('express');
const { start, Accesorios, SolicitudesAccesorios, Usuarios } = require('../modelo/db');
const { Op } = require('sequelize');
const sequelize = require('sequelize');
const { autenticacionjwt } = require('../middlewares/pasaporte');

class RutasAccesorios {
    constructor() {
        this.router = Router();
        start();
        this.rutas();
    }
    getAccesorios = async (req, res) => {
        try {
            //console.log('LOGIN->USUARIO0: ',req)
            let accs = await Accesorios.findAll();
            console.log('LOGIN->USUARIO1: ' + JSON.stringify(accs))
            res.status(201).json(accs)
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
            let turnos = await SolicitudesAccesorios.findAll({
                where: {
                    [Op.and]: [
                        { estado: 'CONFIRMADO' },
                        { accesorio: req.params.idAccesorio },
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
    reservarAccesorio = async (req, res) => {
        try {
            console.log('------>reservarSala->req.body: ' + JSON.stringify(req.body));
            console.log('------>reservarSala->req.usuario: ' + JSON.stringify(req.usuario));
            let accs = await Accesorios.findOne({ where: { idAccesorio: req.body.idAccesorio } });
            console.log('-------->Accesorio: ' + JSON.stringify(accs))
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
                    console.log('----->solicitud denegada<-----')
                    console.log('----->Reservas: ' + JSON.stringify(reservas))
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
                    //console.log('----->reserva: '+JSON.stringify(reserva))        
                    let fechaSolicitud = (new Date()).toJSON().slice(0, 19).replace('T', ' ');
                    console.log('-->fechaSolicitud: ', fechaSolicitud)
                    res.status(201).send({ msj: 'Su pedido será revisado por el administrador del laboratorio, le enviaremos un mail para confirmar la reserva.' });
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
    crearAccesorio = async (req, res) => {
        try {
            let accs = await Accesorios.create({
                descripcionCorta: req.body.descripcionCorta,
                descripcionLarga: req.body.descripcionLarga,
                tipo: req.body.tipo,
                cantidad: req.body.cantidad,
                urlImagen: req.body.urlImagen
            });
            console.log('POST->SALAS: ' + JSON.stringify(accs))
            res.status(201).send({ msj: 'accesorio creado' });
        } catch (error) {
            console.log('error: ' + error)
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    actualizar = async (req, res) => {
        console.log('PUT->/ACCESORIOS-->campos: ', req.body)
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
            console.log('->/ACCESS/UPDATE->RTA: ', resultado);
            res.status(201).send({ msj: 'ok' });
        } catch (error) {
            console.log('error: ' + error)
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    eliminar = async (req, res) => {
        try {
            console.log('->DELETE->idSala ', req.body.idAccesorio)
            let borrado = Accesorios.destroy({ where: { idSala: req.body.idAccesorio } })
            res.status(201).send({ msj: 'accesorio borrado con éxito' });
        } catch (error) {
            console.log('error: ' + error)
            res.statusMessage = error.msj;
            return res.status(error.code || 500).send();
        }
    }
    resolverReserva = async (req, res) => {
        try {
            console.log('------>resolverReserva->req.body: ' + JSON.stringify(req.body));
            let solicitud = await SolicitudesAccesorios.findOne({
                where: {
                    [Op.and]: [
                        { estado: 'PENDIENTE' },
                        { idSolicitudSala: req.body.idSolicitudAccesorio }
                    ]
                }
            });
            console.log('------>resolverReserva->solicitud: ', solicitud);
            if (solicitud !== null) {
                if (req.body.accion === 'r') {
                    let reserva = await SolicitudesAccesorios.update({
                        estado: 'CANCELADO',
                        fechaResolucionSolicitud: (new Date()).toJSON().slice(0, 19).replace('T', ' '),
                    }, {
                        where: { idSolicitudAccesorio: req.body.idSolicitudAccesorio }
                    });
                    /* let asunto = 'Solicitud de reserva de sala';
                    let contenido = 'Sr./Sra. '+req.body.nombre+', su solicitud de reserva de la sala '+ req.body.nombreSala +' ha sido denegada debido a:\n';
                    contenido += req.body.motivo+'. \nA su disposición. Administración de Laboratorios';              
                    mailer(req.body.mail,asunto,contenido); */
                } else if (req.body.accion === 'c') {
                    let reserva = await SolicitudesAccesorios.update({
                        estado: 'CONFIRMADO',
                        fechaResolucionSolicitud: (new Date()).toJSON().slice(0, 19).replace('T', ' '),
                    }, {
                        where: { idSolicitudAccesorio: req.body.idSolicitudAccesorio }
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
            let pendientes = await SolicitudesAccesorios.findAll({ where: { estado: 'PENDIENTE' }, include: [Accesorios, Usuarios] });
            //console.log('getReservasPendientes->pendientes: ',pendientes)
            res.status(201).json(pendientes)
        } catch (error) {
            console.log('errror: ' + error)
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