const {Sequelize, DataTypes} = require('sequelize');
console.log('DATABASE_NAME, DATABASE_USER, DATABASE_PASS: '+process.env.DATABASE_NAME+' - '+process.env.DATABASE_USER+' - '+process.env.DATABASE_PASS)
const sequelize = new Sequelize(process.env.DATABASE_NAME,process.env.DATABASE_USER,process.env.DATABASE_PASS,{
    host: process.env.DATABASE_HOSTNAME,
    dialect: 'mysql'
});

const Usuarios = sequelize.define('Usuario',{
    idUsuario:{type: DataTypes.INTEGER, allowNull:false, autoIncrement:true ,unique:true, primaryKey:true},
    nombre:{type: DataTypes.STRING(40), allowNull:false},
    apellido:{type: DataTypes.STRING(40), allowNull:false},
    mail:{type: DataTypes.STRING(80), allowNull:false, unique:true},
    rol:{type: DataTypes.STRING(4)},
    dni:{type: DataTypes.INTEGER},
    telefono:{type: DataTypes.STRING(10)},
    contrasenia:{type: DataTypes.STRING(255), allowNull:false}
},{timestamps:false, tableName:'usuariosLab'});

const Salas = sequelize.define('Sala',{
    idSala:{type: DataTypes.INTEGER, allowNull:false, autoIncrement:true ,unique:true, primaryKey:true},
    descripcionCorta:{type: DataTypes.STRING(100)},
    descripcionLarga:{type: DataTypes.TEXT},
    tipo:{type: DataTypes.STRING(20)},
    ubicacion:{type: DataTypes.STRING(20)},
    urlImagen:{type: DataTypes.STRING(50)},
},{timestamps:false, tableName:'salasLab'});

const Accesorios = sequelize.define('Accesorio',{
    idAccesorio:{type: DataTypes.INTEGER, allowNull:false, autoIncrement:true ,unique:true, primaryKey:true},
    descripcionCorta:{type: DataTypes.STRING(100)},
    descripcionLarga:{type: DataTypes.TEXT},
    tipo:{type: DataTypes.STRING(20)},
    cantidad:{type: DataTypes.INTEGER},
    urlImagen:{type: DataTypes.STRING(50)},
},{timestamps:false, tableName:'accesoriosLab'});

const SolicitudesSalas = sequelize.define('SolicitudesSalas',{
    idSolicitudSala:{type: DataTypes.INTEGER, allowNull:false, autoIncrement:true ,unique:true, primaryKey:true},
    comentario:{type: DataTypes.TEXT},
    fechaSolicitud:{type: DataTypes.DATE},
    horaInicio:{type: DataTypes.TIME},
    horaFin:{type: DataTypes.TIME},
    estado:{type: DataTypes.STRING(8)},
    fechaAsignada:{type: DataTypes.DATE},
    fechaConfirmacionSolicitud:{type: DataTypes.DATE},
    cantidadAlumnos:{type: DataTypes.INTEGER},
    materia:{type:DataTypes.STRING(80)},
    especialidad:{type:DataTypes.STRING(50)}
},{timestamps:false, tableName:'solicitudesSalas'});

const SolicitudesAccesorios = sequelize.define('SolicitudAccesorios',{
    idSolicitudAccesorio:{type: DataTypes.INTEGER, allowNull:false, autoIncrement:true ,unique:true, primaryKey:true},
    comentario:{type: DataTypes.TEXT},
    cantidad:{type: DataTypes.INTEGER},
    materia:{type:DataTypes.STRING(80)},
    especialidad:{type:DataTypes.STRING(50)},
    fechaSolicitud:{type: DataTypes.DATE},
    horaInicio:{type: DataTypes.TIME},
    horaFin:{type: DataTypes.TIME},
    estado:{type: DataTypes.STRING(8)},
    fechaAsignada:{type: DataTypes.DATE},
    fechaConfirmacionSolicitud:{type: DataTypes.DATE},
},{timestamps:false, tableName:'solicitudesAccesorios'});

const DiasNoHabiles = sequelize.define('DiasNoHabiles',{
    idDia:{type:DataTypes.INTEGER, allowNull:false, autoIncrement:true, unique:true, primaryKey:true},
    dia:{type:DataTypes.DATE},
    horaInicio:{type:DataTypes.TIME},
    horaFin:{type:DataTypes.TIME}
},{timestamps:false, tableName:'diasNoHabiles'})

const Periodo = sequelize.define('Periodo',{
    idPeriodo:{type:DataTypes.INTEGER, allowNull:false, autoIncrement:true, unique:true, primaryKey:true},
    fin:{type:DataTypes.DATE},
},{timestamps:false, tableName:'periodo'})

const start = async()=>{
    try{
        Usuarios.hasMany(SolicitudesSalas,{foreignKey:'usuario'});
        Usuarios.hasMany(SolicitudesAccesorios,{foreignKey:'usuario'});
        Accesorios.hasMany(SolicitudesAccesorios,{foreignKey:'accesorio'});
        Salas.hasMany(SolicitudesSalas,{foreignKey:'sala'});

        SolicitudesSalas.belongsTo(Usuarios,{foreignKey:'usuario'});
        SolicitudesAccesorios.belongsTo(Usuarios,{foreignKey:'usuario'});
        SolicitudesSalas.belongsTo(Salas,{foreignKey:'sala'});
        SolicitudesAccesorios.belongsTo(Accesorios,{foreignKey:'accesorio'});
        //await sequelize.sync({force:false})
        await sequelize.authenticate();
    }catch(err){
        console.log('->Error en conexion a la BD: '+err)
    }    
}

module.exports = {start,Usuarios,Accesorios,Salas,SolicitudesSalas,SolicitudesAccesorios,DiasNoHabiles,Periodo};