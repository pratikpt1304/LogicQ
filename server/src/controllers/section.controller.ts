import { Request, Response } from 'express';
import { SectionService } from '../services/section.service.js';

export class SectionController {
  /**
   * POST /api/sections - Create Section (Section 11)
   */
  static async createSection(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const facultyId = user.userId || user.id;
      const {
        institution,
        course,
        subject,
        academicYear,
        semester,
        sectionName,
        description,
        startDate,
        endDate,
      } = req.body;

      if (!institution || !course || !subject || !academicYear || !semester || !sectionName) {
        return res.status(400).json({
          success: false,
          message: 'Institution, course, subject, academic year, semester, and section name are required.',
        });
      }

      const section = await SectionService.createSection({
        institution,
        course,
        subject,
        academicYear,
        semester,
        sectionName,
        facultyId,
        description,
        startDate,
        endDate,
      });

      return res.status(201).json({
        success: true,
        message: 'Section created successfully.',
        data: section,
        section,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to create section.' });
    }
  }

  /**
   * GET /api/sections - List Faculty Sections
   */
  static async getFacultySections(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const facultyId = user.userId || user.id;
      const isAdmin = user.role === 'ADMIN';
      const sections = await SectionService.getFacultySections(facultyId, isAdmin);
      return res.json({ success: true, data: sections, sections });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to fetch sections.' });
    }
  }

  /**
   * GET /api/sections/:id - Section Details with Student List
   */
  static async getSectionDetails(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const facultyId = user.userId || user.id;
      const section = await SectionService.getSectionById(req.params.id, facultyId);
      if (!section) {
        return res.status(404).json({ success: false, message: 'Section not found.' });
      }
      return res.json({ success: true, data: section, section });
    } catch (err: any) {
      return res.status(err.message.includes('Access denied') ? 403 : 500).json({
        success: false,
        message: err.message || 'Failed to fetch section details.',
      });
    }
  }

  /**
   * DELETE /api/sections/:id - Admin-Only Delete Section
   */
  static async deleteSection(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const isAdmin = user?.role === 'ADMIN';
      const isFaculty = user?.role === 'FACULTY';
      if (!isAdmin && !isFaculty) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only faculty or administrators have permission to delete academic sections.',
        });
      }
      const sectionId = req.params.id;
      const result = await SectionService.deleteSection(sectionId, isAdmin, user?.userId || user?.id);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.message.includes('Access denied') ? 403 : 500).json({
        success: false,
        message: err.message || 'Failed to delete section.',
      });
    }
  }

  /**
   * GET /api/sections/join-info/:tokenOrCode - Public Join Info for Student (Section 13)
   */
  static async getPublicJoinInfo(req: Request, res: Response) {
    try {
      const { tokenOrCode } = req.params;
      const section = await SectionService.getSectionByTokenOrCode(tokenOrCode);
      return res.json({ success: true, data: section, section });
    } catch (err: any) {
      return res.status(404).json({ success: false, message: err.message || 'Invalid or inactive join link.' });
    }
  }

  /**
   * POST /api/sections/preview-excel - Validate Excel without saving (Section 12)
   */
  static async previewExcel(req: Request, res: Response) {
    try {
      let fileBuffer: Buffer | null = null;

      if ((req as any).file && (req as any).file.buffer) {
        fileBuffer = (req as any).file.buffer;
      } else if (req.body && (req.body.base64Data || req.body.fileBase64)) {
        const rawBase64 = req.body.base64Data || req.body.fileBase64;
        const base64Clean = rawBase64.replace(/^data:[^;]+;base64,/, '');
        fileBuffer = Buffer.from(base64Clean, 'base64');
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file payload missing. Upload as file or send base64Data.',
        });
      }

      const preview = await SectionService.parseAndValidateExcel(fileBuffer);
      return res.json({ success: true, data: preview, preview });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Failed to parse Excel file.' });
    }
  }

  /**
   * POST /api/sections/:id/import-students - Commit Validated Roster (Section 12)
   */
  static async importStudents(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const facultyId = user.userId || user.id;
      const isAdmin = user.role === 'ADMIN';
      const { sectionId } = req.params;
      const studentsList = req.body.students || req.body.validStudents;

      if (!Array.isArray(studentsList) || studentsList.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No student records provided for import.',
        });
      }

      const result = await SectionService.commitExcelImport(sectionId, studentsList, facultyId, isAdmin);
      return res.json({
        ...result,
        data: {
          ...result,
          importedCount: result.newlyEnrolled + result.existingUpdated,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to import student roster.' });
    }
  }

  /**
   * POST /api/sections/instant-join - Instant Student Join Form (Section 13)
   */
  static async instantJoin(req: Request, res: Response) {
    try {
      const { joinToken, name, prn, email, mobile, department, year } = req.body;

      if (!joinToken || !name || !prn || !email) {
        return res.status(400).json({
          success: false,
          message: 'Join token, full name, PRN, and email are all required.',
        });
      }

      const result = await SectionService.instantStudentJoin({
        joinToken,
        name,
        prn,
        email,
        mobile,
        department,
        year,
      });

      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Failed to join section.' });
    }
  }

  /**
   * POST /api/sections/enroll-by-code - Authenticated student joins by code & unlocks tests
   */
  static async enrollByCode(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const studentId = user.userId || user.id;
      const { joinCode } = req.body;

      if (!joinCode || typeof joinCode !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Join code is required.',
        });
      }

      const result = await SectionService.enrollStudentByCode(studentId, joinCode);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to enroll in section.',
      });
    }
  }

  /**
   * DELETE /api/sections/:sectionId/students/:studentId - Remove student from section
   */
  static async removeStudent(req: Request, res: Response) {
    try {
      const { sectionId, studentId } = req.params;
      const result = await SectionService.removeStudentFromSection(sectionId, studentId);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to remove student from section.',
      });
    }
  }
}
