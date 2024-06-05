const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const session = require('express-session');
app.use(express.static('public'));

app.use(cookieParser());

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(session( {
    secret: 'secretKey',
    resave: false,
    saveUninitialized: false
}))

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index');
})

app.get('/rektor', async (req, res) => {
    if (!req.session.loggedIn) {
        res.redirect('/login');
    } else if (req.session.user === 'rektor') {
        const brukere = await prisma.bruker.findMany({
            where: {
                rolleId: 1
            }
        }); 

        res.render('rektor', { brukere });
    } else {
        res.redirect('/');
    }
})

app.post('/rektor/tilbyplass', async (req, res) => {
    if (!req.session.loggedIn || req.session.user !== 'rektor') {
        res.redirect('/');
    } else {
        const bruker = await prisma.bruker.update({
            where: { brukernavn: req.body.brukernavn },
            data: { tilbyplass: true }
        });
        res.redirect('/rektor');
    }
})

app.post('/slettbruker', async (req, res) => {
    if (!req.session.loggedIn || req.session.user !== 'rektor') {
        res.redirect('/');
    } else {
        const bruker = await prisma.bruker.delete({
            where: { id: parseInt(req.body.brukerid) }
        });
        res.redirect('/rektor');
    }
})

app.get('/larer', async (req, res) => {
    if (!req.session.loggedIn) {
        res.redirect('/login');
    } else if (req.session.user === 'larer') {
        const brukere = await prisma.bruker.findMany({
            where: {rolleId: 1}
        });
        res.render('larer', { brukere});
    } else {
        res.redirect('/');
    }
})

app.get('/elev', async (req, res) => {
    if (!req.session.loggedIn) {
        res.redirect('/login');
    } else if (req.session.user === 'elev') {
        const bruker = await prisma.bruker.findUnique({
            where: { id: req.session.userId }
        })
        res.render('elev', { bruker });
    } else {
        res.redirect('/');
    }
})

app.post('/elev/akseptert', async (req, res) => {
    const brukerId = req.body.brukerId;
    const bruker = await prisma.bruker.update({
        where: { id: parseInt(brukerId) },
        data: { akseptert: true }
    });
    res.redirect('/elev');
})

app.get('/lagbruker', (req, res) => {
    res.render('lagbruker');
})

app.post('/lagbruker', async (req, res) => {
    const brukernavn = req.body.brukernavn;
    const eksisterendeBruker = await prisma.bruker.findUnique({ where: { brukernavn } });

    if (eksisterendeBruker) {
        res.redirect('/login?error=Bruker finnes allerede');
    } else {
        const bruker = await prisma.bruker.create({
            data: {
                fornavn: req.body.fornavn,
                etternavn: req.body.etternavn,
                adresse: req.body.adresse,
                telefonnummer: parseInt(req.body.telefonnummer),
                email: req.body.email,
                brukernavn: brukernavn,
                passord: await bcrypt.hash(req.body.passord, saltRounds),
                rolleId: 1,
                vilblielev: true,
                tilbyplass: false,
                akseptert: false
                
            }
        }) 
        res.redirect('/login'); 
    }   
})  

app.get('/lagadmin', async (req, res) => {
    const roller = await prisma.rolle.findMany()

    res.render('lagadmin', { roller });
})

app.post('/lagadmin', async (req, res) => {
    const brukernavn = req.body.brukernavn;
    const eksisterendeBruker = await prisma.bruker.findUnique({ where: { brukernavn } });

    if (eksisterendeBruker) {
        res.redirect('/login?error=Bruker finnes allerede');
    } else {
        const bruker = await prisma.bruker.create({
            data: {
                fornavn: req.body.fornavn,
                etternavn: req.body.etternavn,
                adresse: req.body.adresse,
                telefonnummer: parseInt(req.body.telefonnummer),
                email: req.body.email,
                brukernavn: brukernavn,
                passord: await bcrypt.hash(req.body.passord, saltRounds),
                rolleId: parseInt(req.body.rolle),
                vilblielev: false,
                tilbyplass: false,
                akseptert: false
                
            }
        }) 
        res.redirect('/login'); 
    }
})

app.get('/login', (req, res) => {
    res.render('login');
})

app.post('/login', async (req, res) => {
    const brukernavn = req.body.brukernavn;
    const passord = req.body.passord;

    const bruker = await prisma.bruker.findUnique({
        where: { brukernavn },
        include: { rolle: true }
    });
    
    if (bruker && bruker.rolle.navn === 'rektor' && await bcrypt.compare(passord, bruker.passord)) {
        req.session.loggedIn = true;
        req.session.user = 'rektor';
        res.redirect('/rektor');
    } else if (bruker && bruker.rolle.navn === 'larer' && await bcrypt.compare(passord, bruker.passord)) {
        req.session.loggedIn = true;
        req.session.user = 'larer';
        res.redirect('/larer');
    }else if (bruker && bruker.rolle.navn === 'elev' && await bcrypt.compare(passord, bruker.passord)) {
        req.session.loggedIn = true;
        req.session.user = 'elev';
        req.session.userId = bruker.id;
        res.redirect('/elev');
    } else {
        res.redirect('/login?error=Feil brukernavn eller passord');
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err)
        } else {
            res.redirect("/")
        }
    })
})

app.listen(3000)