import { Router } from 'express';
import UserController from '../controllers/user/UserController.js';
import { validateUser } from '../validators/userValidator.js';

const router = Router();

router.post('/', validateUser, UserController.createUser);

export default router;
