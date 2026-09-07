// Lädt die globale Typerweiterung von @types/multer (Express.Multer.File), die der
// Avatar-Upload in booking-page.controller.ts nutzt. Seit TypeScript 6 zieht der
// Compiler solche @types-Pakete nicht mehr von sich aus herein, wenn sie nirgends
// importiert werden – ohne diese Referenz bricht der Build mit TS2694 ab.
/// <reference types="multer" />
