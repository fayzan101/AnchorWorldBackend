import { body, query, ValidationChain } from "express-validator";
import { Gender } from "../types";

export class ValidationUtil {
  static register(): ValidationChain[] {
    return [
      body("email")
        .isEmail()
        .withMessage("Invalid email format")
        .normalizeEmail(),
      body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage("Password must contain uppercase, lowercase, and number"),
      body("full_name")
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Full name must be between 2 and 50 characters"),
      body("date_of_birth")
        .isISO8601()
        .withMessage("Invalid date format")
        .custom((value) => {
          const age = new Date().getFullYear() - new Date(value).getFullYear();
          if (age < 18) throw new Error("Must be at least 18 years old");
          if (age > 100) throw new Error("Invalid date of birth");
          return true;
        }),
      body("gender")
        .isIn(Object.values(Gender))
        .withMessage("Invalid gender value"),
    ];
  }

  static login(): ValidationChain[] {
    return [
      body("email")
        .isEmail()
        .withMessage("Invalid email format")
        .normalizeEmail(),
      body("password").notEmpty().withMessage("Password is required"),
    ];
  }

  static updateProfile(): ValidationChain[] {
    return [
      body("full_name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage("Full name must be between 2 and 255 characters"),

      body("bio")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Bio must not exceed 1000 characters"),

      body("gender")
        .optional()
        .isIn(Object.values(Gender))
        .withMessage(`Gender must be one of: ${Object.values(Gender).join(", ")}`),

      body("city")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("City must not exceed 255 characters"),

      body("country")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Country must not exceed 255 characters"),

      body("location_opt_in")
        .optional()
        .isBoolean()
        .withMessage("location_opt_in must be a boolean"),

      body("conversation_style")
        .optional()
        .trim()
        .isLength({ max: 255 }),

      body("humor_type")
        .optional()
        .trim()
        .isLength({ max: 255 }),

      body("hobbies")
        .optional()
        .isArray()
        .withMessage("Hobbies must be an array of UUIDs"),

      body("hobbies.*")
        .optional()
        .isUUID()
        .withMessage("Each hobby ID must be a valid UUID"),
    ];
  }

  static sendMessage(): ValidationChain[] {
    return [
      body("content")
        .trim()
        .notEmpty()
        .withMessage("Message content is required")
        .isLength({ max: 5000 })
        .withMessage("Message must not exceed 5000 characters"),
    ];
  }

  static pagination(): ValidationChain[] {
    return [
      query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
      query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    ];
  }

  static forgotPassword(): ValidationChain[] {
    return [
      body("email")
        .isEmail()
        .withMessage("Invalid email format")
        .normalizeEmail(),
    ];
  }

  static resetPassword(): ValidationChain[] {
    return [
      body("token").notEmpty().withMessage("Reset token is required"),
      body("new_password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage("Password must contain uppercase, lowercase, and number"),
    ];
  }

  static feedQuery(): ValidationChain[] {
    return [
      ...this.pagination(),
      query("filter")
        .optional()
        .isIn(["circles", "following", "local", "all"])
        .withMessage("Invalid feed filter"),
      query("circle_id")
        .optional()
        .isUUID()
        .withMessage("circle_id must be a valid UUID"),
    ];
  }

  static createPost(): ValidationChain[] {
    return [
      body("content")
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage("Post content must be between 10 and 5000 characters"),
      body("circle_id")
        .optional()
        .isUUID()
        .withMessage("circle_id must be a valid UUID"),
    ];
  }

  static createComment(): ValidationChain[] {
    return [
      body("content")
        .trim()
        .isLength({ min: 3, max: 2000 })
        .withMessage("Comment must be between 3 and 2000 characters"),
    ];
  }

  static communityOnboarding(): ValidationChain[] {
    return [
      body("bio")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Bio must not exceed 1000 characters"),
      body("city")
        .trim()
        .notEmpty()
        .withMessage("City is required")
        .isLength({ max: 255 }),
      body("country")
        .optional()
        .trim()
        .isLength({ max: 255 }),
      body("location_opt_in")
        .optional()
        .isBoolean()
        .withMessage("location_opt_in must be a boolean"),
      body("humor_type")
        .optional()
        .trim()
        .isLength({ max: 255 }),
      body("conversation_style")
        .optional()
        .trim()
        .isLength({ max: 255 }),
      body("interests")
        .optional()
        .isArray({ min: 1 })
        .withMessage("interests must be a non-empty array"),
      body("hobbies")
        .optional()
        .isArray({ min: 1 })
        .withMessage("hobbies must be a non-empty array"),
      body("suggested_circle_ids")
        .isArray({ min: 2 })
        .withMessage("Join at least 2 circles"),
      body("suggested_circle_ids.*")
        .isUUID()
        .withMessage("Each suggested_circle_id must be a valid UUID"),
    ];
  }

  static updateProfileLocation(): ValidationChain[] {
    return [
      body("city")
        .trim()
        .notEmpty()
        .withMessage("City is required")
        .isLength({ max: 255 }),
      body("country")
        .optional()
        .trim()
        .isLength({ max: 255 }),
      body("location_opt_in")
        .isBoolean()
        .withMessage("location_opt_in must be a boolean"),
    ];
  }

  static userListQuery(): ValidationChain[] {
    return [
      ...this.pagination(),
      query("purpose")
        .equals("search")
        .withMessage('purpose=search is required to list users'),
      query("gender")
        .optional()
        .isIn(Object.values(Gender))
        .withMessage("Invalid gender value"),
      query("search")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1 and 100 characters"),
    ];
  }
}
