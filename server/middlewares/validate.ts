import { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";

export const validateRequest = (schema: z.ZodSchema<any>, source: "body" | "query" | "params" = "body") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues.map((issue) => issue.message).join(", ");
        return res.status(400).json({ error: message });
      }
      return res.status(400).json({ error: "Malformed request payload" });
    }
  };
};
