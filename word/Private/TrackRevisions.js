"use strict";
/**
 * User: Ilja.Kirillov
 * Date: 09.10.2015
 * Time: 15:12
 */

//----------------------------------------------------------------------------------------------------------------------
// Работаем с рецензированием
//----------------------------------------------------------------------------------------------------------------------
asc_docs_api.prototype.asc_SetTrackRevisions = function(bTrack)
{
    return this.WordControl.m_oLogicDocument.Set_TrackRevisions(bTrack);
};
asc_docs_api.prototype.asc_IsTrackRevisions = function()
{
    return this.WordControl.m_oLogicDocument.Is_TrackRevisions();
};
asc_docs_api.prototype.sync_BeginCatchRevisionsChanges = function()
{
    this.RevisionChangesStack = [];
};
asc_docs_api.prototype.sync_EndCatchRevisionsChanges = function()
{
    this.asc_fireCallback("asc_onShowRevisionsChange", this.RevisionChangesStack);
};
asc_docs_api.prototype.sync_AddRevisionsChange = function(Change)
{
    this.RevisionChangesStack.push(Change);
};
asc_docs_api.prototype.asc_AcceptChanges = function(Change)
{
    if (undefined !== Change)
        this.WordControl.m_oLogicDocument.Accept_RevisionChange(Change);
    else
        this.WordControl.m_oLogicDocument.Accept_RevisionChangesBySelection();
};
asc_docs_api.prototype.asc_RejectChanges = function(Change)
{
    if (undefined !== Change)
        this.WordControl.m_oLogicDocument.Reject_RevisionChange(Change);
    else
        this.WordControl.m_oLogicDocument.Reject_RevisionChangesBySelection();
};
asc_docs_api.prototype.asc_HaveRevisionsChanges = function()
{
    this.WordControl.m_oLogicDocument.Have_RevisionChanges();
};
asc_docs_api.prototype.asc_HaveNewRevisionsChanges = function()
{
    return this.asc_HaveRevisionsChanges();
};
asc_docs_api.prototype.asc_GetNextRevisionsChange = function()
{
    return this.WordControl.m_oLogicDocument.Get_NextRevisionChange();
};
asc_docs_api.prototype.asc_GetPrevRevisionsChange = function()
{
    return this.WordControl.m_oLogicDocument.Get_PrevRevisionChange();
};
asc_docs_api.prototype.sync_UpdateRevisionsChangesPosition = function(X, Y)
{
    this.asc_fireCallback("asc_onUpdateRevisionsChangesPosition", X, Y);
};
asc_docs_api.prototype.asc_AcceptAllChanges = function()
{
    this.WordControl.m_oLogicDocument.Accept_AllRevisionChanges();
};
asc_docs_api.prototype.asc_RejectAllChanges = function()
{
    this.WordControl.m_oLogicDocument.Reject_AllRevisionChanges();
};
//----------------------------------------------------------------------------------------------------------------------
// CDocument
//----------------------------------------------------------------------------------------------------------------------
CDocument.prototype.Set_TrackRevisions = function(bTrack)
{
    this.TrackRevisions = bTrack;
};
CDocument.prototype.Continue_TrackRevisions = function()
{
    this.TrackRevisionsManager.Continue_TrackRevisions();
};
CDocument.prototype.Get_NextRevisionChange = function()
{
    this.TrackRevisionsManager.Continue_TrackRevisions();
    var Change = this.TrackRevisionsManager.Get_NextChange();
    if (null !== Change)
    {
        this.Selection_Remove();
        var Para = Change.get_Paragraph();
        Para.Selection.Use = true;
        Para.Set_SelectionContentPos(Change.get_StartPos(), Change.get_EndPos());
        Para.Set_ParaContentPos(Change.get_StartPos(), false, -1, -1);
        Para.Document_SetThisElementCurrent(false);

        this.Document_UpdateSelectionState();
        this.Document_UpdateInterfaceState(true);
    }
};
CDocument.prototype.Get_PrevRevisionChange = function()
{
    this.TrackRevisionsManager.Continue_TrackRevisions();
    var Change = this.TrackRevisionsManager.Get_PrevChange();
    if (null !== Change)
    {
        this.Selection_Remove();
        var Para = Change.get_Paragraph();
        Para.Selection.Use = true;
        Para.Set_SelectionContentPos(Change.get_StartPos(), Change.get_EndPos());
        Para.Set_ParaContentPos(Change.get_StartPos(), false, -1, -1);
        Para.Document_SetThisElementCurrent(false);

        this.Document_UpdateSelectionState();
        this.Document_UpdateInterfaceState(true);
    }
};
CDocument.prototype.Get_RevisionsChangeParagraph = function(Direction, CurrentPara)
{
    return this.private_GetRevisionsChangeParagraph(Direction, CurrentPara).Get_FoundedParagraph();
};
CDocument.prototype.private_GetRevisionsChangeParagraph = function(Direction, CurrentPara)
{
    var SearchEngine = new CRevisionsChangeParagraphSearchEngine(Direction, CurrentPara, this.TrackRevisionsManager);
    if (null === CurrentPara)
    {
        CurrentPara = this.Get_CurrentParagraph();
        if (null === CurrentPara)
            return SearchEngine;

        SearchEngine.Set_CurrentParagraph(CurrentPara);
        SearchEngine.Set_FoundedParagraph(CurrentPara);
        if (true === SearchEngine.Is_Found())
            return SearchEngine;
    }

    var HdrFtr = CurrentPara.Get_HdrFtr();
    if (null !== HdrFtr)
    {
        this.private_GetRevisionsChangeParagraphInHdrFtr(SearchEngine, HdrFtr);

        if (true !== SearchEngine.Is_Found())
            this.private_GetRevisionsChangeParagraphInDocument(SearchEngine, Direction < 0 ? this.Content.length - 1 : 0);

        if (true !== SearchEngine.Is_Found())
            this.private_GetRevisionsChangeParagraphInHdrFtr(SearchEngine, null);
    }
    else
    {
        var Pos = (true === this.Selection.Use && docpostype_DrawingObjects !== this.CurPos.Type ? (this.Selection.StartPos <= this.Selection.EndPos ? this.Selection.StartPos : this.Selection.EndPos) : this.CurPos.ContentPos);
        this.private_GetRevisionsChangeParagraphInDocument(SearchEngine, Pos);

        if (true !== SearchEngine.Is_Found())
            this.private_GetRevisionsChangeParagraphInHdrFtr(SearchEngine, null);

        if (true !== SearchEngine.Is_Found())
            this.private_GetRevisionsChangeParagraphInDocument(SearchEngine, Direction > 0 ? 0 : this.Content.length - 1);
    }

    return SearchEngine;
};
CDocument.prototype.private_GetRevisionsChangeParagraphInDocument = function(SearchEngine, Pos)
{
    var Direction = SearchEngine.Get_Direction();
    this.Content[Pos].Get_RevisionsChangeParagraph(SearchEngine);
    while (true !== SearchEngine.Is_Found())
    {
        Pos = (Direction > 0 ? Pos + 1 : Pos - 1);
        if (Pos >= this.Content.length || Pos < 0)
            break;

        this.Content[Pos].Get_RevisionsChangeParagraph(SearchEngine);
    }
};
CDocument.prototype.private_GetRevisionsChangeParagraphInHdrFtr = function(SearchEngine, HdrFtr)
{
    var AllHdrFtrs = this.SectionsInfo.Get_AllHdrFtrs();
    var Count = AllHdrFtrs.length;

    if (Count <= 0)
        return;

    var Pos = -1;
    if (null !== HdrFtr)
    {
        for (var Index = 0; Index < Count; ++Index)
        {
            if (HdrFtr === AllHdrFtrs[Index])
            {
                Pos = Index;
                break;
            }
        }
    }

    var Direction = SearchEngine.Get_Direction();
    if (Pos < 0 || Pos >= Count)
    {
        if (Direction > 0)
            Pos = 0;
        else
            Pos = Count - 1;
    }

    AllHdrFtrs[Pos].Get_RevisionsChangeParagraph(SearchEngine);
    while (true !== SearchEngine.Is_Found())
    {
        Pos = (Direction > 0 ? Pos + 1 : Pos - 1);
        if (Pos >= Count || Pos < 0)
            break;

        AllHdrFtrs[Pos].Get_RevisionsChangeParagraph(SearchEngine);
    }
};
CDocument.prototype.private_SelectRevisionChange = function(Change)
{
    if (undefined !== Change && Change.get_Paragraph())
    {
        this.Selection_Remove();
        var Para = Change.get_Paragraph();
        Para.Selection.Use = true;
        Para.Set_SelectionContentPos(Change.get_StartPos(), Change.get_EndPos());
        Para.Set_ParaContentPos(Change.get_StartPos(), false, -1, -1);
        Para.Document_SetThisElementCurrent(false);
    }
};
CDocument.prototype.Accept_RevisionChange = function(Change)
{
    if (undefined !== Change)
    {
        var RelatedParas = this.TrackRevisionsManager.Get_ChangeRelatedParagraphs(Change, true);
        if (false === this.Document_Is_SelectionLocked(changestype_None, { Type : changestype_2_ElementsArray_and_Type, Elements : RelatedParas, CheckType : changestype_Paragraph_Content}))
        {
            this.Create_NewHistoryPoint(historydescription_Document_AcceptRevisionChange);
            this.private_SelectRevisionChange(Change);
            this.Accept_RevisionChanges(Change.get_Type(), false);
        }
    }
};
CDocument.prototype.Reject_RevisionChange = function(Change)
{
    if (undefined !== Change)
    {
        var RelatedParas = this.TrackRevisionsManager.Get_ChangeRelatedParagraphs(Change, false);
        if (false === this.Document_Is_SelectionLocked(changestype_None, { Type : changestype_2_ElementsArray_and_Type, Elements : RelatedParas, CheckType : changestype_Paragraph_Content}))
        {
            this.Create_NewHistoryPoint(historydescription_Document_RejectRevisionChange);
            this.private_SelectRevisionChange(Change);
            this.Reject_RevisionChanges(Change.get_Type(), false);
        }
    }
};
CDocument.prototype.Accept_RevisionChangesBySelection = function()
{
    var CurrentChange = this.TrackRevisionsManager.Get_CurrentChange();
    if (null !== CurrentChange)
        this.Accept_RevisionChange(CurrentChange);
    else
    {
        var SelectedParagraphs = this.Get_AllParagraphs({Selected : true});
        var RelatedParas = this.TrackRevisionsManager.Get_AllChangesRelatedParagraphsBySelectedParagraphs(SelectedParagraphs, true);
        if (false === this.Document_Is_SelectionLocked(changestype_None, { Type : changestype_2_ElementsArray_and_Type, Elements : RelatedParas, CheckType : changestype_Paragraph_Content}))
        {
            this.Create_NewHistoryPoint(historydescription_Document_AcceptRevisionChangesBySelection);
            this.Accept_RevisionChanges(undefined, false);

            if (true === this.History.Is_LastPointEmpty())
                this.History.Remove_LastPoint();
        }
    }

    this.Get_NextRevisionChange();
};
CDocument.prototype.Reject_RevisionChangesBySelection = function()
{
    var CurrentChange = this.TrackRevisionsManager.Get_CurrentChange();
    if (null !== CurrentChange)
        this.Reject_RevisionChange(CurrentChange);
    else
    {
        var SelectedParagraphs = this.Get_AllParagraphs({Selected : true});
        var RelatedParas = this.TrackRevisionsManager.Get_AllChangesRelatedParagraphsBySelectedParagraphs(SelectedParagraphs, false);
        if (false === this.Document_Is_SelectionLocked(changestype_None, { Type : changestype_2_ElementsArray_and_Type, Elements : RelatedParas, CheckType : changestype_Paragraph_Content}))
        {
            this.Create_NewHistoryPoint(historydescription_Document_AcceptRevisionChangesBySelection);
            this.Reject_RevisionChanges(undefined, false);

            if (true === this.History.Is_LastPointEmpty())
                this.History.Remove_LastPoint();
        }
    }

    this.Get_NextRevisionChange();
};
CDocument.prototype.Accept_AllRevisionChanges = function()
{
    var RelatedParas = this.TrackRevisionsManager.Get_AllChangesRelatedParagraphs(true);
    if (false === this.Document_Is_SelectionLocked(changestype_None, { Type : changestype_2_ElementsArray_and_Type, Elements : RelatedParas, CheckType : changestype_Paragraph_Content}))
    {
        this.Create_NewHistoryPoint(historydescription_Document_AcceptAllRevisionChanges);
        var LogicDocuments = this.TrackRevisionsManager.Get_AllChangesLogicDocuments();
        for (var LogicDocId in LogicDocuments)
        {
            var LogicDoc = g_oTableId.Get_ById(LogicDocId);
            if (LogicDoc)
            {
                LogicDoc.Accept_RevisionChanges(undefined, true);
            }
        }

        if (true === this.History.Is_LastPointEmpty())
        {
            this.History.Remove_LastPoint();
            return;
        }

        this.Selection_Remove();
        this.private_CorrectDocumentPosition();
        this.Recalculate();
        this.Document_UpdateSelectionState();
        this.Document_UpdateInterfaceState();
    }
};
CDocument.prototype.Reject_AllRevisionChanges = function()
{
    var RelatedParas = this.TrackRevisionsManager.Get_AllChangesRelatedParagraphs(false);
    if (false === this.Document_Is_SelectionLocked(changestype_None, { Type : changestype_2_ElementsArray_and_Type, Elements : RelatedParas, CheckType : changestype_Paragraph_Content}))
    {
        this.Create_NewHistoryPoint(historydescription_Document_RejectAllRevisionChanges);
        var LogicDocuments = this.TrackRevisionsManager.Get_AllChangesLogicDocuments();
        for (var LogicDocId in LogicDocuments)
        {
            var LogicDoc = g_oTableId.Get_ById(LogicDocId);
            if (LogicDoc)
            {
                LogicDoc.Reject_RevisionChanges(undefined, true);
            }
        }

        if (true === this.History.Is_LastPointEmpty())
        {
            this.History.Remove_LastPoint();
            return;
        }

        this.Selection_Remove();
        this.private_CorrectDocumentPosition();
        this.Recalculate();
        this.Document_UpdateSelectionState();
        this.Document_UpdateInterfaceState();
    }
};
CDocument.prototype.Accept_RevisionChanges = function(Type, bAll)
{
    // Принимаем все изменения, которые попали в селект.
    // Принимаем изменения в следующей последовательности:
    // 1. Изменение настроек параграфа
    // 2. Изменение настроек текста
    // 3. Добавление/удаление текста
    // 4. Добавление/удаление параграфа
    if (docpostype_Content === this.CurPos.Type || true === bAll)
    {
        if (true === this.Selection.Use || true === bAll)
        {
            var StartPos = this.Selection.StartPos;
            var EndPos = this.Selection.EndPos;
            if (StartPos > EndPos)
            {
                StartPos = this.Selection.EndPos;
                EndPos = this.Selection.StartPos;
            }

            var LastElement = this.Content[EndPos];
            var LastParaEnd = (type_Paragraph === LastElement.Get_Type() && true === LastElement.Selection_CheckParaEnd() ? true : false);

            if (true === bAll)
            {
                StartPos = 0;
                EndPos = this.Content.length - 1;
                LastParaEnd = true;
            }

            if (undefined === Type || c_oAscRevisionsChangeType.ParaPr === Type)
            {
                for (var CurPos = StartPos; CurPos <= EndPos; CurPos++)
                {
                    var Element = this.Content[CurPos];
                    if (type_Paragraph === Element.Get_Type() && (true === Element.Is_SelectedAll() || true == bAll) && true === Element.Have_PrChange())
                    {
                        Element.Accept_PrChange();
                    }
                }
            }

            for (var CurPos = StartPos; CurPos <= EndPos; CurPos++)
            {
                var Element = this.Content[CurPos];
                Element.Accept_RevisionChanges(Type, bAll);
            }

            if (undefined === Type || c_oAscRevisionsChangeType.ParaAdd === Type || c_oAscRevisionsChangeType.ParaRem === Type)
            {
                EndPos = (true === LastParaEnd ? EndPos : EndPos - 1);
                for (var CurPos = EndPos; CurPos >= StartPos; CurPos--)
                {
                    var Element = this.Content[CurPos];
                    if (type_Paragraph === Element.Get_Type())
                    {
                        var ReviewType = Element.Get_ReviewType();
                        if (reviewtype_Add === ReviewType && (undefined === Type || c_oAscRevisionsChangeType.ParaAdd === Type))
                        {
                            Element.Set_ReviewType(reviewtype_Common);
                        }
                        else if (reviewtype_Remove === ReviewType && (undefined === Type || c_oAscRevisionsChangeType.ParaRem === Type))
                        {
                            Element.Set_ReviewType(reviewtype_Common);
                            this.Concat_Paragraphs(CurPos);
                        }
                    }
                }
            }
        }
    }
    else if (docpostype_HdrFtr === this.CurPos.Type)
    {
        this.HdrFtr.Accept_RevisionChanges(Type, bAll);
    }
    else if (docpostype_DrawingObjects === this.CurPos.Type)
    {
        this.DrawingObjects.Accept_RevisionChanges(Type, bAll);
    }

    if (true !== bAll)
    {
        this.Recalculate();
        this.Document_UpdateInterfaceState();
        this.Document_UpdateSelectionState();
    }
};
CDocument.prototype.Reject_RevisionChanges = function(Type, bAll)
{
    // Отменяем все изменения, которые попали в селект.
    // Отменяем изменения в следующей последовательности:
    // 1. Изменение настроек параграфа
    // 2. Изменение настроек текста
    // 3. Добавление/удаление текста
    // 4. Добавление/удаление параграфа

    if (docpostype_Content === this.CurPos.Type || true === bAll)
    {
        if (true === this.Selection.Use || true === bAll)
        {
            var StartPos = this.Selection.StartPos;
            var EndPos = this.Selection.EndPos;
            if (StartPos > EndPos)
            {
                StartPos = this.Selection.EndPos;
                EndPos = this.Selection.StartPos;
            }

            var LastElement = this.Content[EndPos];
            var LastParaEnd = (type_Paragraph === LastElement.Get_Type() && true === LastElement.Selection_CheckParaEnd() ? true : false);

            if (true === bAll)
            {
                StartPos = 0;
                EndPos = this.Content.length - 1;
                LastParaEnd = true;
            }

            if (undefined === Type || c_oAscRevisionsChangeType.ParaPr === Type)
            {
                for (var CurPos = StartPos; CurPos <= EndPos; CurPos++)
                {
                    var Element = this.Content[CurPos];
                    if (type_Paragraph === Element.Get_Type() && (true === Element.Is_SelectedAll() || true === bAll) && true === Element.Have_PrChange())
                    {
                        Element.Reject_PrChange();
                    }
                }
            }

            for (var CurPos = StartPos; CurPos <= EndPos; CurPos++)
            {
                var Element = this.Content[CurPos];
                Element.Reject_RevisionChanges(Type, bAll);
            }

            if (undefined === Type || c_oAscRevisionsChangeType.ParaAdd === Type || c_oAscRevisionsChangeType.ParaRem === Type)
            {
                EndPos = (true === LastParaEnd ? EndPos : EndPos - 1);
                for (var CurPos = EndPos; CurPos >= StartPos; CurPos--)
                {
                    var Element = this.Content[CurPos];
                    if (type_Paragraph === Element.Get_Type())
                    {
                        var ReviewType = Element.Get_ReviewType();
                        if (reviewtype_Add === ReviewType && (undefined === Type || c_oAscRevisionsChangeType.ParaAdd === Type))
                        {
                            Element.Set_ReviewType(reviewtype_Common);
                            this.Concat_Paragraphs(CurPos);
                        }
                        else if (reviewtype_Remove === ReviewType && (undefined === Type || c_oAscRevisionsChangeType.ParaRem === Type))
                        {
                            Element.Set_ReviewType(reviewtype_Common);
                        }
                    }
                }
            }
        }
    }
    else if (docpostype_HdrFtr === this.CurPos.Type)
    {
        this.HdrFtr.Reject_RevisionChanges(Type, bAll);
    }
    else if (docpostype_DrawingObjects === this.CurPos.Type)
    {
        this.DrawingObjects.Reject_RevisionChanges(Type, bAll);
    }

    if (true !== bAll)
    {
        this.Recalculate();
        this.Document_UpdateInterfaceState();
        this.Document_UpdateSelectionState();
    }
};
CDocument.prototype.Have_RevisionChanges = function()
{
    this.TrackRevisionsManager.Continue_TrackRevisions();
    return this.TrackRevisionsManager.Have_Changes();
};
//----------------------------------------------------------------------------------------------------------------------
// CHeaderFooterController
//----------------------------------------------------------------------------------------------------------------------
CHeaderFooterController.prototype.Accept_RevisionChanges = function(Type, bAll)
{
    if (null !== this.CurHdrFtr)
        this.CurHdrFtr.Content.Accept_RevisionChanges(Type, bAll);
};
CHeaderFooterController.prototype.Reject_RevisionChanges = function(Type, bAll)
{
    if (null !== this.CurHdrFtr)
        this.CurHdrFtr.Content.Reject_RevisionChanges(Type, bAll);
};
//----------------------------------------------------------------------------------------------------------------------
// CDocumentContent
//----------------------------------------------------------------------------------------------------------------------
CDocumentContent.prototype.Accept_RevisionChanges = function(Type, bAll)
{
    if (docpostype_Content === this.CurPos.Type || true === bAll)
    {
        if (true === this.Selection.Use || true === bAll)
        {
            var StartPos = this.Selection.StartPos;
            var EndPos   = this.Selection.EndPos;
            if (StartPos > EndPos)
            {
                StartPos = this.Selection.EndPos;
                EndPos   = this.Selection.StartPos;
            }
            var LastElement = this.Content[EndPos];
            var LastParaEnd = (type_Paragraph === LastElement.Get_Type() && true === LastElement.Selection_CheckParaEnd() ? true : false);

            if (true === bAll)
            {
                StartPos    = 0;
                EndPos      = this.Content.length - 1;
                LastParaEnd = true;
            }

            if (undefined === Type || c_oAscRevisionsChangeType.ParaPr === Type)
            {
                for (var CurPos = StartPos; CurPos <= EndPos; CurPos++)
                {
                    var Element = this.Content[CurPos];
                    if (type_Paragraph === Element.Get_Type() && (true === Element.Is_SelectedAll() || true === bAll) && true === Element.Have_PrChange())
                    {
                        Element.Accept_PrChange();
                    }
                }
            }

            for (var CurPos = StartPos; CurPos <= EndPos; CurPos++)
            {
                var Element = this.Content[CurPos];
                Element.Accept_RevisionChanges(Type, bAll);
            }

            if (undefined === Type || c_oAscRevisionsChangeType.ParaAdd === Type || c_oAscRevisionsChangeType.ParaRem === Type)
            {
                EndPos = (true === LastParaEnd ? EndPos : EndPos - 1);
                for (var CurPos = EndPos; CurPos >= StartPos; CurPos--)
                {
                    var Element = this.Content[CurPos];
                    if (type_Paragraph === Element.Get_Type())
                    {
                        var ReviewType = Element.Get_ReviewType();
                        if (reviewtype_Add === ReviewType && (undefined === Type || c_oAscRevisionsChangeType.ParaAdd === Type))
                        {
                            Element.Set_ReviewType(reviewtype_Common);
                        }
                        else if (reviewtype_Remove === ReviewType && (undefined === Type || c_oAscRevisionsChangeType.ParaRem === Type))
                        {
                            Element.Set_ReviewType(reviewtype_Common);
                            this.Concat_Paragraphs(CurPos);
                        }
                    }
                }
            }
        }
    }
    else if (docpostype_DrawingObjects === this.CurPos.Type)
    {
        this.DrawingObjects.Accept_RevisionChanges(Type, bAll);
    }
};
CDocumentContent.prototype.Reject_RevisionChanges = function(Type, bAll)
{
    if (docpostype_Content === this.CurPos.Type || true === bAll)
    {
        if (true === this.Selection.Use || true === bAll)
        {
            var StartPos = this.Selection.StartPos;
            var EndPos = this.Selection.EndPos;
            if (StartPos > EndPos)
            {
                StartPos = this.Selection.EndPos;
                EndPos = this.Selection.StartPos;
            }
            var LastElement = this.Content[EndPos];
            var LastParaEnd = (type_Paragraph === LastElement.Get_Type() && true === LastElement.Selection_CheckParaEnd() ? true : false);

            if (true === bAll)
            {
                StartPos = 0;
                EndPos = this.Content.length - 1;
                LastParaEnd = true;
            }

            if (undefined === Type || c_oAscRevisionsChangeType.ParaPr === Type)
            {
                for (var CurPos = StartPos; CurPos <= EndPos; CurPos++)
                {
                    var Element = this.Content[CurPos];
                    if (type_Paragraph === Element.Get_Type() && (true === Element.Is_SelectedAll() || true === bAll) && true === Element.Have_PrChange())
                    {
                        Element.Reject_PrChange();
                    }
                }
            }

            for (var CurPos = StartPos; CurPos <= EndPos; CurPos++)
            {
                var Element = this.Content[CurPos];
                Element.Reject_RevisionChanges(Type, bAll);
            }

            if (undefined === Type || c_oAscRevisionsChangeType.ParaAdd === Type || c_oAscRevisionsChangeType.ParaRem === Type)
            {
                EndPos = (true === LastParaEnd ? EndPos : EndPos - 1);
                for (var CurPos = EndPos; CurPos >= StartPos; CurPos--)
                {
                    var Element = this.Content[CurPos];
                    if (type_Paragraph === Element.Get_Type())
                    {
                        var ReviewType = Element.Get_ReviewType();
                        if (reviewtype_Add === ReviewType && (undefined === Type || c_oAscRevisionsChangeType.ParaAdd === Type))
                        {
                            Element.Set_ReviewType(reviewtype_Common);
                            this.Concat_Paragraphs(CurPos);
                        }
                        else if (reviewtype_Remove === ReviewType && (undefined === Type || c_oAscRevisionsChangeType.ParaRem === Type))
                        {
                            Element.Set_ReviewType(reviewtype_Common);
                        }
                    }
                }
            }
        }
    }
    else if (docpostype_DrawingObjects === this.CurPos.Type)
    {
        this.DrawingObjects.Reject_RevisionChanges(Type, bAll);
    }
};
CDocumentContent.prototype.Get_RevisionsChangeParagraph = function(SearchEngine)
{
    if (true === SearchEngine.Is_Found())
        return;

    var Direction = SearchEngine.Get_Direction();
    var Pos = 0;
    if (true !== SearchEngine.Is_CurrentFound())
    {
        Pos = (true === this.Selection.Use ? (this.Selection.StartPos <= this.Selection.EndPos ? this.Selection.StartPos : this.Selection.EndPos) : this.CurPos.ContentPos);
    }
    else
    {
        if (Direction > 0)
        {
            Pos = 0;
        }
        else
        {
            Pos = this.Content.length - 1;
        }
    }

    this.Content[Pos].Get_RevisionsChangeParagraph(SearchEngine);
    while (true !== SearchEngine.Is_Found())
    {
        Pos = (Direction > 0 ? Pos + 1 : Pos - 1);
        if (Pos >= this.Content.length || Pos < 0)
            break;

        this.Content[Pos].Get_RevisionsChangeParagraph(SearchEngine);
    }
};