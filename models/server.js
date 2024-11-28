const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');

class Server{
    constructor(){
        this.app = express();
        this.port = process.env.PORT;

        this.middlewares();
        this.routes();
        this.listen();
        this.conectarBD();
    }
    conectarBD(){
        this.con = mysql.createPool({
            host: "localhost",
            user: "root",
            password: "12345",
            database: "usuarios_bd"
        });
    }
    middlewares(){
        this.app.use(express.static('./public'));
        this.app.use(express.json());
        this.app.use(express.urlencoded());
        this.app.set('view engine', 'ejs');
        //Sesiones
        this.app.set('trust proxy', 1);// trust first proxy
        this.app.use(session({
            secret: 'keyboard cat',
            resave: false,
            saveUninitialized: true,
            cookie: {secure: false}
        }));
    }
    routes(){
        this.app.get('/health',(req, res) => {
            let usuario = req.session.user;
            let rol = req.session.rol;
            if(req.session.user){
                if(req.session.rol == "admin"){                 
                    res.render('health',{usuario: usuario, rol:rol});
                }
                else if(req.session.rol == "visitante"){
                    res.render('health',{usuario: usuario, rol:rol});
                }
            }else{
                res.render('error', { mensaje: 'No iniciaste sesión' });
            }     
        });
        this.app.get('/hola',(req,res) => {
            if(req.session.user){
                if(req.session.rol == "admin"){
                    res.send('Hola admin' + req.session.user);
                }else if(req.session.rol == "general"){
                    res.send('Hola general' + req.session.user);
                }
            }else{
                res.render('error',{mensaje: 'Inicia sesión!'});
            }
        });

        this.app.post("/login", (req, res) => {
            let user = req.body.usuario;
            let pass = req.body.cont;

            console.log("Ruta login...");
            console.log(user);
            console.log(pass);

            this.con.query("SELECT * FROM usuarios WHERE usuario='" + user + "'", (err, result, fields) => {
                if (err) throw err;
                if (result.length > 0) {
                    if (bcrypt.compareSync(pass, result[0].cont)) {
                        console.log('Credenciales correctas');
                        //Crear sesión
                        req.session.user = user;
                        req.session.rol = result[0].rol;
                        //Registro de log
                        res.render('index', { usuario: user, rol: 'admin' });
                    } else {
                        console.log('Contraseña incorrecta');
                        res.render('error', { mensaje: 'Usuario o contraseña incorrecta' });
                    }
                } else {
                    console.log('Usuario no existe');
                    res.render('error', { mensaje: 'Usuario o contraseña incorrecta' });
                }
                //console.log(result.length);
            });
        });

        this.app.post('/registrar',(req, res) => {
            let user = req.body.usuario;
            let cont = req.body.cont;
            //Cifrar contraseña
            let salt = bcrypt.genSaltSync(12);
            let hashedCont = bcrypt.hashSync(cont, salt);
            ////////////////////
            let datos = [user, hashedCont, 'general'];
            let sql = "insert into usuarios values (?,?,?)";
            //insert into usuarios values ('') or 1=1 and ('','cont','general')
            this.con.query(sql, datos, (err, result) => {
                if(err) throw err;
                console.log("Usuario guardado...");
                res.redirect('/');
            });
        });
    }
    listen(){
        this.app.listen(this.port, () => {
            console.log("Servidor escuchando: http://127.0.0.1:" + this.port);
        });
    }
}

module.exports = Server;