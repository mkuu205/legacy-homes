import { Router } from 'express';
import { paymentMethodController } from '../controllers/payment-method.controller';
import { authenticate } from '../middleware/auth';

const router: import("express").Router = Router();

// Get all payment methods for the authenticated resident
router.get('/', authenticate, paymentMethodController.getPaymentMethods.bind(paymentMethodController));

// Add a new payment method
router.post('/', authenticate, paymentMethodController.addPaymentMethod.bind(paymentMethodController));

// Set a payment method as default
router.put('/:id/default', authenticate, paymentMethodController.setDefaultMethod.bind(paymentMethodController));

// Delete a payment method
router.delete('/:id', authenticate, paymentMethodController.deletePaymentMethod.bind(paymentMethodController));

export default router;
