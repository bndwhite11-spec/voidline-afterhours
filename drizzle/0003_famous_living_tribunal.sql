CREATE INDEX `live_changes_message_seq` ON `live_changes` (`message_id`,`seq`);--> statement-breakpoint
CREATE INDEX `live_messages_thread_seq` ON `live_messages` (`thread_root_id`,`seq`);--> statement-breakpoint
CREATE INDEX `live_messages_reply` ON `live_messages` (`reply_to_id`);