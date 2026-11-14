import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ImageOff,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  PackageSearch,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

export interface ReportCardItem {
  _id: string;
  title: string;
  titleSi?: string;
  titleTa?: string;
  description: string;
  descriptionSi?: string;
  descriptionTa?: string;
  type: string;
  category: string;
  imageUrl?: string;
  date: string;
  district: string;
  city: string;
  status: string;
  handedToPolice?: boolean;
  policeStationName?: string;
  createdBy: { _id: string; username?: string } | string | null;
  archiveStatus?: 'active' | 'archived';
}

const ItemCard: React.FC<{ item: ReportCardItem; onChange?: () => void }> = ({ item, onChange }) => {
  const { t, i18n } = useTranslation();
  const { user, fetchMe } = useAuth();
  const navigate = useNavigate();
  const [working, setWorking] = useState(false);
  const creatorId = typeof item.createdBy === 'object' ? item.createdBy?._id : item.createdBy;
  const isOwner = Boolean(user?._id && user._id === creatorId);
  const isReturned = item.status === 'Claimed';
  const isArchived = item.archiveStatus === 'archived';
  const title =
    i18n.language === 'si' && item.titleSi
      ? item.titleSi
      : i18n.language === 'ta' && item.titleTa
        ? item.titleTa
        : item.title;
  const description =
    i18n.language === 'si' && item.descriptionSi
      ? item.descriptionSi
      : i18n.language === 'ta' && item.descriptionTa
        ? item.descriptionTa
        : item.description;
  const imageURL = item.imageUrl?.startsWith('http')
    ? item.imageUrl
    : item.imageUrl
      ? (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001') +
        '/uploads/' +
        item.imageUrl
      : '';
  const refresh = () => {
    if (onChange) onChange();
    else window.location.reload();
  };

  const remove = async () => {
    const result = await Swal.fire({
      title: t('ui.deleteTitle'),
      text: t('ui.deleteDescription'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('ui.cancel'),
      focusCancel: true,
    });
    if (!result.isConfirmed) return;
    setWorking(true);
    try {
      await api.delete('/items/' + item._id);
      refresh();
    } catch (error: any) {
      Swal.fire(t('ui.actionError'), error.response?.data?.message || t('ui.tryAgain'), 'error');
    } finally {
      setWorking(false);
    }
  };
  const markReturned = async () => {
    const result = await Swal.fire({
      title: t('ui.returnTitle'),
      text: t('ui.returnDescription'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('ui.confirmReturn'),
      cancelButtonText: t('ui.cancel'),
      focusCancel: true,
    });
    if (!result.isConfirmed) return;
    setWorking(true);
    try {
      await api.put('/items/' + item._id + '/claim');
      await fetchMe();
      refresh();
    } catch (error: any) {
      Swal.fire(t('ui.actionError'), error.response?.data?.message || t('ui.tryAgain'), 'error');
    } finally {
      setWorking(false);
    }
  };
  const contact = () => {
    if (!user) {
      navigate('/login', { state: { from: '/chat/' + item._id + '/' + creatorId } });
      return;
    }
    navigate('/chat/' + item._id + '/' + creatorId);
  };

  return (
    <article className="ui-panel flex h-full flex-col overflow-hidden transition-colors hover:border-slate-300 dark:hover:border-slate-500">
      <Link
        to={'/items/' + item._id}
        className="relative block aspect-[3/2] overflow-hidden bg-slate-100 dark:bg-slate-900"
        aria-label={t('ui.viewNamedReport', { title })}
      >
        {imageURL ? (
          <img
            src={imageURL}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <ImageOff className="h-9 w-9" aria-hidden="true" />
            <span className="text-xs">{t('item.noImage')}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {isReturned ? (
            <span className="ui-badge ui-success border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('ui.returned')}
            </span>
          ) : isArchived ? (
            <span className="ui-badge bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {t('nav.archivedItems')}
            </span>
          ) : (
            <span
              className={
                'ui-badge border ' +
                (item.type === 'LOST'
                  ? 'ui-pending border-amber-200 dark:border-amber-800'
                  : 'ui-success border-emerald-200 dark:border-emerald-800')
              }
            >
              {item.type === 'LOST' ? (
                <Search className="h-3.5 w-3.5" />
              ) : (
                <PackageSearch className="h-3.5 w-3.5" />
              )}
              {item.type === 'SMART_TAG'
                ? t('item.smartTag')
                : item.type === 'LOST'
                  ? t('ui.lostReports')
                  : t('ui.foundReports')}
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
          <span className="ui-muted">
            {t('categories.' + item.category, { defaultValue: item.category })}
          </span>
          {isOwner && (
            <span className="font-medium text-brand-700 dark:text-brand-300">
              {t('ui.yourReport')}
            </span>
          )}
        </div>
        <h3 className="min-h-[3rem] text-lg font-semibold leading-6 tracking-tight">
          <Link
            to={'/items/' + item._id}
            className="line-clamp-2 rounded hover:text-brand-700 dark:hover:text-brand-300"
          >
            {title}
          </Link>
        </h3>
        <p className="ui-muted mt-2 line-clamp-2 text-sm leading-6">{description}</p>
        <div className="ui-muted mt-5 space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {item.city}, {item.district}
            </span>
          </p>
          {item.date && (
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              <time dateTime={item.date}>
                {new Date(item.date).toLocaleDateString(i18n.language, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </p>
          )}
          {item.handedToPolice && item.policeStationName && (
            <p className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.policeStationName}</span>
            </p>
          )}
        </div>
        <p className="ui-muted mt-4 text-xs">
          {t('ui.reportedBy')}{' '}
          <span className="font-medium">
            {typeof item.createdBy === 'object' && item.createdBy?.username
              ? '@' + item.createdBy.username
              : t('ui.communityMember')}
          </span>
        </p>
        <div className="mt-auto pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <Link
              to={'/items/' + item._id}
              className="ui-quiet -ml-2 gap-1 px-2 text-brand-700 dark:text-brand-300"
            >
              {t('ui.viewReport')}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {isOwner ? (
              <details className="relative">
                <summary
                  className="ui-secondary flex list-none cursor-pointer px-3 [&::-webkit-details-marker]:hidden"
                  aria-label={t('ui.reportActions', { title })}
                >
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">{t('ui.reportActions', { title })}</span>
                </summary>
                <div className="ui-panel absolute bottom-full right-0 z-10 mb-2 w-52 p-1.5 shadow-lg">
                  {!isArchived && (
                    <Link className="ui-quiet w-full justify-start" to={'/edit/' + item._id}>
                      {t('common.edit')}
                    </Link>
                  )}
                  {!isReturned && !isArchived && (
                    <button
                      type="button"
                      className="ui-quiet w-full justify-start"
                      disabled={working}
                      onClick={markReturned}
                    >
                      {t('ui.markReturned')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="ui-quiet w-full justify-start text-red-700 dark:text-red-300"
                    disabled={working}
                    onClick={remove}
                  >
                    {working ? t('common.loading') : t('common.delete')}
                  </button>
                </div>
              </details>
            ) : (
              !isReturned &&
              !isArchived &&
              user?.role !== 'police' && (
                <button type="button" className="ui-secondary px-3" onClick={contact}>
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  {t('ui.contact')}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
export default ItemCard;
