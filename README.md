# Beverage Business Management API

A comprehensive NestJS-based API for managing a beverage business, including features for products, orders, employees, tables, and statistics.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [Database Migrations & Seeding](#database-migrations--seeding)
- [API Documentation](#api-documentation)

## Introduction

The **Beverage Business Management API** is a robust and scalable backend solution tailored for modern beverage shops, cafes, and restaurants. Built with **NestJS**, it provides a solid foundation for managing daily operations, from inventory and order processing to employee performance and financial reporting.

What sets this project apart is its integration of **AI-driven insights** and **real-time statistics**, empowering business owners to make data-backed decisions. Whether it's tracking the top-selling drinks, managing staff schedules, or automating approval workflows for sensitive actions, this API handles it all with security and efficiency in mind.

## Features

The application is modularized into several key business domains:

- **🤖 AI Assistant**: Built-in intelligent chatbot powered by OpenAI to provide instant answers about business performance (revenue, orders, etc.).
- **📊 Real-time Statistics**: Dashboard-ready APIs for tracking total revenue, order completion rates, and top-selling products.
- **🔐 Advanced Security**: Secure authentication/authorization system with JWT and granular Role-Based Access Control (RBAC).
- **🛒 Order & Invoice Management**: Seamless flow from table ordering to invoice generation and payment processing.
- **👥 Employee & User System**: Comprehensive management of staff profiles, roles, and permissions.
- **📦 Product & Inventory**: Manage categories, products, prices, and images with ease.
- **✅ Approval Workflows**: Structured approval process for critical actions (e.g., refunds, voids) ensuring accountability.
- **📍 Area & Table Management**: Digital mapping of physical store layout for efficient table service.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MySQL](https://www.mysql.com/)
- **ORM**: [TypeORM](https://typeorm.io/)
- **Documentation**: [Swagger](https://swagger.io/)
- **Tools**:
  - **Validation**: class-validator, class-transformer
  - **Authentication**: Passport, JWT
  - **Email**: Nodemailer
  - **Excel**: ExcelJS
  - **AI**: OpenAI SDK

## Prerequisites

- Node.js (v18 or later recommended)
- Yarn or NPM
- MySQL Database

## Installation

1.  **Clone the repository**

    ```bash
    git clone <repository-url>
    cd api_nest_quan_ly_kinh_doanh_do_uong
    ```

2.  **Install dependencies**

    ```bash
    yarn install
    ```

3.  **Environment Configuration**

    Create a `.env` file in the root directory and configure your environment variables (Database connection, JWT secret, etc.).

## Running the App

```bash
# development
yarn run start

# watch mode
yarn run start:dev

# production mode
yarn run start:prod
```

## Database Migrations & Seeding

**Run Migrations:**

```bash
yarn migration:run
```

**Seed Database (Admin user, initial data):**

```bash
yarn seed
```

## API Documentation

Once the application is running, you can access the Swagger API documentation at:

```
http://localhost:3000/api
```

_(Note: Replace `3000` with your configured PORT if different)_

## Project Structure

```
src/
├── common/         # Shared configuration, decorators, filters
├── core/           # Core modules, guards, interceptors
├── database/       # Migrations, seeds, data source config
├── modules/        # Feature modules (Auth, Product, Order, etc.)
└── main.ts         # Application entry point
```
