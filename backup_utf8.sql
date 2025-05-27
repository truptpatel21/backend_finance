-- MySQL dump 10.13  Distrib 9.0.1, for Win64 (x86_64)
--
-- Host: localhost    Database: finance
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `table_name` varchar(255) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budgets`
--

DROP TABLE IF EXISTS `budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budgets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `year` year(4) NOT NULL,
  `month` tinyint(4) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `alert_threshold` decimal(5,2) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `csd` (`user_id`),
  CONSTRAINT `budgets_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `csd` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budgets`
--

LOCK TABLES `budgets` WRITE;
/*!40000 ALTER TABLE `budgets` DISABLE KEYS */;
INSERT INTO `budgets` VALUES (1,3,NULL,2025,3,4000.00,90.00,0,'2025-05-22 12:14:48','2025-05-27 05:11:35'),(2,3,NULL,2025,4,3000.00,90.00,0,'2025-05-22 12:16:49','2025-05-27 05:11:31'),(4,1,NULL,2025,6,2000.00,90.00,0,'2025-05-23 04:34:54','2025-05-26 12:33:53'),(5,1,NULL,2025,7,5000.00,NULL,0,'2025-05-26 10:54:39','2025-05-26 11:00:51'),(6,1,NULL,2025,8,9000.00,NULL,0,'2025-05-26 11:02:00','2025-05-26 11:02:00'),(7,5,NULL,2025,5,3000.00,NULL,0,'2025-05-26 11:23:59','2025-05-26 12:30:49'),(8,5,NULL,2025,6,5000.00,NULL,0,'2025-05-26 12:28:24','2025-05-26 12:28:24'),(9,6,NULL,2025,6,12000.00,NULL,0,'2025-05-27 06:18:17','2025-05-27 06:18:17'),(10,6,NULL,2025,5,9500.00,NULL,0,'2025-05-27 06:18:37','2025-05-27 06:18:37'),(11,6,NULL,2025,7,7800.00,NULL,0,'2025-05-27 06:19:19','2025-05-27 06:19:19');
/*!40000 ALTER TABLE `budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('income','expense','all') DEFAULT 'all',
  `is_active` tinyint(1) DEFAULT 1,
  `is_deleted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `parent_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_category` (`user_id`,`name`,`type`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,NULL,'Salary','income',1,0,'2025-05-22 10:17:05','2025-05-22 10:17:05',NULL),(2,NULL,'Business','income',1,0,'2025-05-22 10:17:05','2025-05-22 10:17:05',NULL),(3,NULL,'Food','expense',1,0,'2025-05-22 10:17:05','2025-05-22 10:17:05',NULL),(4,NULL,'Rent','expense',1,0,'2025-05-22 10:17:05','2025-05-22 10:17:05',NULL),(5,NULL,'Utilities','expense',1,0,'2025-05-22 10:17:05','2025-05-22 10:17:05',NULL),(6,NULL,'Entertainment','expense',1,0,'2025-05-22 10:17:05','2025-05-22 10:17:05',NULL),(7,NULL,'Petrol','income',1,0,'2025-05-22 12:04:27','2025-05-27 04:33:55',NULL),(9,NULL,'Transport','expense',1,0,'2025-05-23 04:34:22','2025-05-27 04:35:11',NULL),(10,NULL,'other','all',1,0,'2025-05-26 10:29:52','2025-05-26 10:30:32',NULL),(12,NULL,'Bills','expense',1,0,'2025-05-27 06:16:54','2025-05-27 06:16:54',NULL);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `devices`
--

DROP TABLE IF EXISTS `devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `device_type` varchar(100) DEFAULT NULL,
  `token` varchar(512) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `devices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `devices`
--

LOCK TABLES `devices` WRITE;
/*!40000 ALTER TABLE `devices` DISABLE KEYS */;
INSERT INTO `devices` VALUES (1,1,'',NULL,0,'2025-05-22 10:56:32','2025-05-27 05:12:09'),(2,3,'',NULL,0,'2025-05-22 11:35:27','2025-05-27 09:30:21'),(3,4,'',NULL,0,'2025-05-26 08:57:17','2025-05-26 09:36:53'),(4,5,'','JYDRKbDW5aGJqb8Uo1ZcNY6ngngdBMjkziDzM21myOdIXGb7ZhgsorcL+HEKzU83Jgd4zTtGb4ND39UXxNL4bbjEaMn+LBcOotcz9Iy4xgFGDtYANdTraE84OdnbOWMQCt9QCFarGadcMH8xe5zcGoRB8ZMiBNaBu0Zb/o57szNbWMX6Ld8rS/oh/jGWWesU5zsctJT6j1aFMF86Q4wGWVcplQViZtw2iK6Pt1NIPH4=',0,'2025-05-26 11:22:39','2025-05-26 12:34:30'),(5,6,'','JYDRKbDW5aGJqb8Uo1ZcNY6ngngdBMjkziDzM21myOdIXGb7ZhgsorcL+HEKzU839CEy0ChXl2b88IaoP5tny2Nt2XeWYn25to37j/l+HbwVcsrXLYgeVzXFD3DM5MB6f8fpnAUBsYHCEWEKkFj+XOBXc67fbdhlcmgI0W74tXbndO1hhTJzu5LFJvTqdlHOFYmR6p9Dl9Hw/mgfPXyjsMDxMBCsKnU2FH4s4VLhbF0=',0,'2025-05-27 05:14:18','2025-05-27 09:30:32');
/*!40000 ALTER TABLE `devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goals`
--

DROP TABLE IF EXISTS `goals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `target_amount` decimal(12,2) NOT NULL,
  `current_amount` decimal(12,2) DEFAULT 0.00,
  `deadline` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `goals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goals`
--

LOCK TABLES `goals` WRITE;
/*!40000 ALTER TABLE `goals` DISABLE KEYS */;
INSERT INTO `goals` VALUES (1,1,'Vacation Fund',10000.00,2000.00,'2025-06-10','2025-05-23 04:10:04','2025-05-23 04:45:27'),(2,1,'Tour',25000.00,1552.00,'2025-12-10','2025-05-23 04:56:25','2025-05-23 05:10:26'),(3,1,'Buy a Bike',100000.00,55000.00,'2025-08-15','2025-05-23 05:29:03','2025-05-23 05:30:20'),(4,1,'Buy House',10000000.00,0.00,'2027-08-05','2025-05-26 11:05:29','2025-05-26 11:05:29'),(5,5,'Buy Car',1400000.00,0.00,'2026-05-26','2025-05-26 11:23:40','2025-05-26 11:23:40'),(6,6,'Buy Car',1600000.00,1000000.00,'2026-01-01','2025-05-27 06:44:03','2025-05-27 07:23:01');
/*!40000 ALTER TABLE `goals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('reminder','alert','info') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `related_transaction_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_noti` (`user_id`),
  CONSTRAINT `user_noti` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,'alert','Budget','You have crossed your budget',0,11,'2025-05-22 12:25:34');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recurring_transactions`
--

DROP TABLE IF EXISTS `recurring_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recurring_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `frequency` enum('daily','weekly','monthly','yearly') NOT NULL,
  `next_due_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `recurring_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `recurring_transactions_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recurring_transactions`
--

LOCK TABLES `recurring_transactions` WRITE;
/*!40000 ALTER TABLE `recurring_transactions` DISABLE KEYS */;
INSERT INTO `recurring_transactions` VALUES (1,1,1,500.00,'monthly','2025-05-26','2024-12-31','2025-05-23 04:08:40','2025-05-23 04:38:54'),(2,6,4,6000.00,'monthly','2025-06-20',NULL,'2025-05-27 05:55:25','2025-05-27 05:55:25'),(3,6,3,2000.00,'weekly','2025-06-01','2026-12-01','2025-05-27 06:02:57','2025-05-27 06:02:57');
/*!40000 ALTER TABLE `recurring_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `report_type` enum('income','expense','budget','summary') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
INSERT INTO `reports` VALUES (1,1,'summary','2024-06-01','2024-06-30','/uploads/reports/june-summary.pdf','2025-05-23 04:16:36');
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shared_budgets`
--

DROP TABLE IF EXISTS `shared_budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shared_budgets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `budget_id` int(11) NOT NULL,
  `shared_with_user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `budget_id` (`budget_id`),
  KEY `shared_with_user_id` (`shared_with_user_id`),
  CONSTRAINT `shared_budgets_ibfk_1` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`),
  CONSTRAINT `shared_budgets_ibfk_2` FOREIGN KEY (`shared_with_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shared_budgets`
--

LOCK TABLES `shared_budgets` WRITE;
/*!40000 ALTER TABLE `shared_budgets` DISABLE KEYS */;
INSERT INTO `shared_budgets` VALUES (2,2,1,'2025-05-23 04:14:50','2025-05-23 04:14:50');
/*!40000 ALTER TABLE `shared_budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tags_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tags`
--

LOCK TABLES `tags` WRITE;
/*!40000 ALTER TABLE `tags` DISABLE KEYS */;
INSERT INTO `tags` VALUES (2,'Groceries',1,'2025-05-23 04:11:24');
/*!40000 ALTER TABLE `tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_tags`
--

DROP TABLE IF EXISTS `transaction_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `transaction_tags_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`),
  CONSTRAINT `transaction_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_tags`
--

LOCK TABLES `transaction_tags` WRITE;
/*!40000 ALTER TABLE `transaction_tags` DISABLE KEYS */;
INSERT INTO `transaction_tags` VALUES (4,1,2);
/*!40000 ALTER TABLE `transaction_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `transaction_date` date NOT NULL,
  `note` varchar(512) DEFAULT '------',
  `is_active` tinyint(4) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_recurring` tinyint(1) DEFAULT 0,
  `reference_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cat_tra` (`category_id`),
  KEY `user_tra` (`user_id`),
  CONSTRAINT `cat_tra` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_tra` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,3,1,300.00,'expense','2025-05-22','Petrol',1,0,'2025-05-22 12:08:29','2025-05-22 12:08:29',0,NULL),(2,1,1,300.00,'expense','2025-05-22','Petrol',1,0,'2025-05-22 12:11:55','2025-05-22 12:11:55',0,NULL),(3,1,1,3000.00,'income','2025-05-22','Stifend',1,0,'2025-05-23 04:27:07','2025-05-23 04:27:07',0,NULL),(6,1,9,500.00,'expense','2025-05-15','Bus fare',1,0,'2025-05-23 04:34:54','2025-05-23 04:34:54',0,NULL),(7,1,9,300.00,'expense','2025-05-20','Taxi',1,0,'2025-05-23 04:34:54','2025-05-23 04:34:54',0,NULL),(8,1,7,200.00,'expense','2025-05-10','----',1,0,'2025-05-23 05:25:29','2025-05-27 04:58:38',0,NULL),(10,1,9,3000.00,'income','2025-05-01','----',1,0,'2025-05-23 05:25:29','2025-05-27 04:58:42',0,NULL),(11,1,7,250.00,'expense','2025-06-10','----',1,0,'2025-05-23 05:25:29','2025-05-27 04:59:03',0,NULL),(13,1,9,3200.00,'income','2025-06-01','----',1,0,'2025-05-23 05:25:29','2025-05-27 04:59:07',0,NULL),(14,1,1,3000.00,'income','2025-05-20','Stiphend',1,0,'2025-05-26 10:39:03','2025-05-26 10:39:03',0,NULL),(15,1,3,300.00,'expense','2025-05-25','Pizza',1,0,'2025-05-26 11:06:27','2025-05-26 11:06:27',0,NULL),(16,1,4,6000.00,'expense','2025-05-16','Rent',1,0,'2025-05-26 11:06:55','2025-05-26 11:06:55',0,NULL),(17,5,1,3000.00,'income','2025-05-26','Stiphend',1,0,'2025-05-26 11:24:46','2025-05-26 11:24:46',0,NULL),(18,5,3,100.00,'expense','2025-05-25','Chinese',1,0,'2025-05-26 12:21:05','2025-05-26 12:21:05',0,NULL),(19,5,4,2350.00,'expense','2025-05-25','rent credited',1,0,'2025-05-26 12:29:52','2025-05-26 12:31:31',0,NULL),(20,6,3,500.00,'expense','2025-05-26','Vada pav',1,0,'2025-05-27 06:13:34','2025-05-27 06:13:34',0,NULL),(21,6,5,950.00,'expense','2025-05-20','Groceries',1,0,'2025-05-27 06:14:55','2025-05-27 06:14:55',0,NULL),(22,6,7,250.00,'expense','2025-05-27','Activa Petrol',1,0,'2025-05-27 06:15:36','2025-05-27 06:15:36',0,NULL),(23,6,5,1670.00,'expense','2025-04-15','Buy new Water Bottle',1,0,'2025-05-27 06:16:35','2025-05-27 06:16:35',0,NULL),(24,6,1,3000.00,'income','2025-05-13','Stiphend for internship',1,0,'2025-05-27 06:17:49','2025-05-27 06:17:49',0,NULL),(25,6,10,5000.00,'expense','2025-05-21','Buy a new Jordan Shoe',1,0,'2025-05-27 06:28:42','2025-05-27 06:28:42',0,NULL),(26,6,9,233.00,'expense','2025-05-25','Bus ticket',1,0,'2025-05-27 08:44:25','2025-05-27 08:44:25',0,NULL);
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `uploads`
--

DROP TABLE IF EXISTS `uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `uploads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `transaction_id` int(11) DEFAULT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_upload` (`user_id`),
  CONSTRAINT `user_upload` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `uploads`
--

LOCK TABLES `uploads` WRITE;
/*!40000 ALTER TABLE `uploads` DISABLE KEYS */;
INSERT INTO `uploads` VALUES (1,1,NULL,'/user',NULL,NULL,'2025-05-22 12:29:31');
/*!40000 ALTER TABLE `uploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_settings`
--

DROP TABLE IF EXISTS `user_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `language` varchar(10) DEFAULT 'en',
  `currency` varchar(10) DEFAULT 'INR',
  `notification_email` tinyint(1) DEFAULT 1,
  `notification_push` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_settings`
--

LOCK TABLES `user_settings` WRITE;
/*!40000 ALTER TABLE `user_settings` DISABLE KEYS */;
INSERT INTO `user_settings` VALUES (1,1,'English','USD',1,1,'2025-05-22 12:35:42','2025-05-22 12:36:04');
/*!40000 ALTER TABLE `user_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `address` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_deleted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Trupt','trupt@gmail.com','$2b$10$WmsNknh7Y5qkY1r9UgRmfuWUukFA/HjnzjltXD7l3jTR0FxqKkcrW','user','Palanpur',1,0,'2025-05-22 10:56:32','2025-05-26 10:12:35'),(3,'Admin12','admin12@gmail.com','$2b$10$hNcXJ0ur96zPQ0HJ6YvcRePwiTCAWp.b6lHn2R4sxmgMDioc7Z1QK','admin',NULL,1,0,'2025-05-22 11:35:27','2025-05-22 11:36:01'),(4,'Jemmy D','jemmy@gmail.com','$2b$10$csSqTpuYE.PbUPi69NwQA.oW43QoF3RynQF2h7F2eu2CNS8bubnDG','user','Ahmedabad',1,0,'2025-05-26 08:57:17','2025-05-27 09:22:06'),(5,'smit','smit@gmail.com','$2b$10$KARtIQd/dh5jugCepdQWnergA.0cOTMBlPoaSyyZUpto.UHjKi87W','user','Ahmedabad',1,0,'2025-05-26 11:22:39','2025-05-27 09:24:08'),(6,'Arpit','arpit@gmail.com','$2b$10$O57TbzvUdTlDatn.kC3r7.KNhsj81oPRuwxECeb22j3Y12010H6UG','user',NULL,1,0,'2025-05-27 05:14:18','2025-05-27 05:14:18');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-27 15:41:40
