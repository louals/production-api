import express from 'express';
import { signup } from '../controllers/auth.controller.js';
const router = express.Router();

router.post('/sign-in', (req, res) => {
    res.send('Login');
});

router.post('/sign-up', signup);

router.post('/sign-out', (req, res) => {
    res.send('Sign out');
});

export default router;
