import express from 'express';
import jwt from 'jsonwebtoken';
import {authorize} from '../helpers/verifyToken';
import {UserValidator} from '../validatiors/userValidator';
import {secret} from '../config';

import User from '../models/user';

const bcrypt = require('bcryptjs');

const router = express.Router();

router.post('/register', async (req, res, next) => {
    //Validate input
    const {error} = UserValidator.validateRegistration(req.body);
    if (error) {
        return res.status(400).send({status: 'error', msg: error.details[0].message});
    }

    //Hash pw
    try{
        const salt = await bcrypt.genSalt(10);
        const hashedPw = await bcrypt.hash(req.body.password, salt);
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPw,
        });
        let newUser = await user.save();
        res.status(201).send({
            msg: 'Llogaria u krijua me sukses',
            user: {username: user.username, email: user.email}
        });
    }catch (e) {
        res.status(400).send({status: 'error', msg: e.errmsg});
        console.log(e.errmsg);
    }
});

router.post('/login', async (req, res, next) => {
    //Validate input
    console.log(req.body);
    try {
        //find user
        const user = await User.findOne({username: req.body.username});
        if (!user) {
            console.log('----------------');
            return res.status(400).send({status: 'error', msg: 'Username ose passwordi eshte gabim!'});
        }

        //decrypt pw
        const valid = await bcrypt.compare(req.body.password, user.password);
        if (!valid) {
            res.status(400).send({status: 'error', msg: 'Username ose passwordi eshte gabim.'});
            next();
        } else {
            //generate token
            let date = new Date();
            date.setHours(date.getHours() + 1);
            const token = jwt.sign({_id: user._id, role: user.role}, secret, {expiresIn: '1h'});
            res.send({token, expiration: date, username: user.username, role: user.role, id: user._id});
            next();
        }
    } catch (e) {
        console.log('exception',e);
        res.status(400).send(e)
    }
});

router.post('/password', authorize, (req, res, next) => {
    User.findById(req.user._id).then(async user => {
        try {
            const valid = await bcrypt.compare(req.body.password, user.password);
            if(!valid){
                res.status(400).send({msg: 'current password is invalid'});
            }
            if(req.body.newPassword.length < 8){
                return res.status(400).send({msg: 'Passwordi duhet ti kete 8 shkronja'});
            }else{
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(req.body.newPassword, salt);
                return user.save();
            }
        }catch (e) {
            res.status(400).send({msg: 'error changing pw', e});
        }
    }).then(value => {
        res.send({msg: 'password was sucessfuly updated'});
    }).catch(reason => {
        console.log(reason);
        res.status(400).send(reason);
    })
});

module.exports = router;
