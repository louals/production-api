import logger from "#config/logger.js";
import { createUser, authenticateUser } from "#services/auth.service.js";
import { signupSchema, singinSchema } from "#validations/auth.validation.js";
import { formatValidationErrors } from "#utils/format.js";

export const signup = async (req, res, next) => {
  try {
    const validationResult = signupSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: formatValidationErrors(validationResult.error)
      });
    }

    const { name, email, password, role } = validationResult.data;

    const user = await createUser({ name, email, password, role });

    res.status(201).json({
      message: 'User registered successfully',
      user
    });

  } catch (error) {
    logger.error("Signup error", error);
    if (error.message === 'User with this email already exists') {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
};

export const signin = async (req, res, next) => {
  try {
    const validationResult = singinSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: formatValidationErrors(validationResult.error)
      });
    }

    const { email, password } = validationResult.data;

    const user = await authenticateUser({ email, password });

    res.status(200).json({
      message: 'User signed in successfully',
      user,
    });
  } catch (error) {
    logger.error("Signin error", error);
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ message: error.message });
    }
    next(error);
  }
};

export const signout = async (req, res, next) => {
  try {
    // If session or auth cookies are introduced in the future,
    // they should be cleared here.
    res.status(200).json({
      message: 'User signed out successfully',
    });
  } catch (error) {
    logger.error("Signout error", error);
    next(error);
  }
};
