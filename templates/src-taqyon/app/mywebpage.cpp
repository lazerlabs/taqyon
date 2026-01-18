#include "mywebpage.h"
#include <QDesktopServices>
#include <QDebug> // For logging

MyWebPage::MyWebPage(QWebEngineProfile *profile, QObject *parent)
    : QWebEnginePage(profile, parent)
{
}

bool MyWebPage::acceptNavigationRequest(const QUrl &url, NavigationType type, bool isMainFrame)
{
    if (isMainFrame && type == QWebEnginePage::NavigationTypeLinkClicked) {
        if (url.scheme() == QLatin1String("http") || url.scheme() == QLatin1String("https")) {
            qInfo() << "Intercepted link click to:" << url.toString() << ". Opening externally.";
            QDesktopServices::openUrl(url);
            return false; // We've handled it
        }
    }
    return QWebEnginePage::acceptNavigationRequest(url, type, isMainFrame);
} 