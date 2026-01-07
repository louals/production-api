import logger from "#config/logger.js";
import { createUser } from "#services/auth.service.js";
import { signupSchema } from "#validations/auth.validation.js";
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
