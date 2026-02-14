import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserTable1770901690885 implements MigrationInterface {
    name = 'CreateUserTable1770901690885'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`created_by\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`is_deleted\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`last_login_at\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`full_name\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`role\` enum ('ADMIN', 'MANAGER', 'STAFF') NOT NULL DEFAULT 'STAFF'`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`refresh_token\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`status\` \`status\` enum ('ACTIVE', 'INACTIVE', 'BANNED') NOT NULL DEFAULT 'ACTIVE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`status\` \`status\` enum ('active', 'locked', 'inactive') NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`refresh_token\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`role\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`full_name\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`last_login_at\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`is_deleted\` tinyint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`updated_by\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`created_by\` varchar(255) NULL`);
    }

}
