'use strict';

/**
 * src/modules/notifications/notifications.controller.js
 */

const notificationsService = require('./notifications.service');

class NotificationsController {
  async listMine(req, res, next) {
    try {
      const { unread, page, pageSize } = req.query;
      const result = await notificationsService.listForUser(req.user.sub, {
        unreadOnly: unread === 'true',
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      });

      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async markRead(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await notificationsService.markRead(id, req.user.sub);

      res.json({
        ok: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async markAllRead(req, res, next) {
    try {
      const result = await notificationsService.markAllRead(req.user.sub);

      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationsController();

