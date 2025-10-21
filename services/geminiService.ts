// This file now acts as a public facade for the modular Gemini services.
// By re-exporting everything from the new structure, we avoid having to
// update imports in all other files across the application.
export * from './gemini';
