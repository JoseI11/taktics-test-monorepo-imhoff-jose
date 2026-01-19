# Taktics Test Monorepo — Imhoff Jose

Monorepo con:
- **Frontend (admin/):** AngularJS 1.5 + Bootstrap/Materialism (Webpack)
- **Backend (server/):** LoopBack 3 (API REST)

Este proyecto implementa el módulo **Budgets**: listado con filtros, creación/edición con estructura de **chapters** y **batches**, cálculo de totales y validación mínima para asegurar integridad.

---

## Features (Budgets)
- **Listado** de budgets con filtros:
  - `name`
  - `clientName`
  - rango de fechas (`dateFrom`, `dateTo`)
- **Crear / Editar** budget:
  - `name`, `clientName`, `date`, `thumbnail`
- **Chapters & Batches**
  - crear/eliminar chapters
  - crear/eliminar batches dentro de cada chapter
  - `rank` para ordenar visualmente
- **Cálculos automáticos**
  - UI: recálculo local para feedback inmediato
  - Backend: recálculo server-side antes de persistir (fuente de verdad)
- **Confirmaciones**
  - delete budget (modal)
  - delete chapter/batch (`confirm()`)
- **Mensajes UX**
  - `Budget created successfully`
  - `Budget updated successfully`
  - (opcional) `Budget deleted successfully`

---

## Tech Stack
**Frontend**
- AngularJS 1.5.8
- ui-router
- Bootstrap (materialism theme)
- Webpack dev server

**Backend**
- LoopBack 3
- PersistedModel (`Budget`)
- Hook `before save` para validar y recalcular

---

## Project Structure (high level)
```text
taktics-test-monorepo/
├── README.md
├── ACCEPTANCE_CRITERIA.md
├── budget_structure.png
├── admin/                # Frontend AngularJS
└── server/               # Backend LoopBack 3
```

---

## Requirements
- Node.js + npm

---

## Installation
Desde la raíz del repo:

### Backend
```bash
cd server
npm install
```

### Frontend
```bash
cd ../admin
npm install
```

---

## Run Locally

### 1) Start Backend (LoopBack 3)
```bash
cd server
npm start
```
Backend por defecto: `http://localhost:3000`

### 2) Start Frontend (admin)
```bash
cd admin
npm run start
```
Frontend: `http://localhost:9000`

> El frontend usa **proxy** hacia `/api` (webpack) apuntando a `http://localhost:3000`.

---

## API (Budget)
Endpoint principal:
- `GET /api/Budgets`
- `POST /api/Budgets`
- `PUT /api/Budgets/:id`
- `DELETE /api/Budgets/:id`

---

## Data Model (Budget)
“Al iniciar el backend, se crea un budget demo solo si la colección está vacía.”

“Si se usa memory datasource, el seed corre cada restart (porque la colección arranca vacía).”
Estructura general:
- `Budget`
  - name (required)
  - clientName (required)
  - date (required)
  - thumbnail
  - totalCost, totalSale
  - chapters[]

- `Chapter`
  - rank
  - description
  - saleCoefMaterial (default 1)
  - saleCoefLabour (default 1)
  - totalCost, totalSale
  - batches[]

- `Batch`
  - rank
  - description
  - amount
  - materialCost
  - labourCost
  - unitCost, totalCost
  - unitSale, totalSale

---

## Validation & Data Integrity (Backend)
Para evitar “basura” en el backend:
- Normalización de arrays (`chapters`, `batches`)
- Validación estricta de campos numéricos:
  - rechaza valores no numéricos (ej: letras) → **422**
  - rechaza negativos → **422**
- Recalcula siempre en servidor:
  - totals por batch, chapter y budget

**Nota:** El frontend calcula para UX, pero **el backend recalcula y valida** para garantizar integridad.

---

## UX Notes (Frontend)
- Inputs numéricos se manejan como `text` + `ng-pattern` para evitar bugs de tipeo y permitir edición fluida.
- Sanitización en `blur` para normalizar valores (ej: sacar letras).
- El botón **Save** usa submit (evita doble guardado) y se deshabilita mientras `vm.saving` está activo.
- Flash message al guardar: se envía con `$rootScope.flash` y se muestra al volver al listado.

---


## Notes about Styling (SCSS)
El proyecto incluye `node-sass` y un entrypoint SCSS:
- `admin/src/app/assets/css/sass/materialism.scss`

Los estilos del módulo Budgets se agregan en:
- `admin/src/app/assets/css/sass/_budgets.scss`

---

## Author
Imhoff Jose
