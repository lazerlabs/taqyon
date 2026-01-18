#include "mywebview.h"
#include <QWebEnginePage>
#include <QMenu>
#include <QDesktopServices>
#include <QApplication>
#include <QClipboard>
#include <QWebEngineContextMenuRequest>
#include <QPoint>
#include <QDebug>
#include <QMainWindow>

MyWebView::MyWebView(QWidget *parent)
    : QWebEngineView(parent)
{
}

void MyWebView::contextMenuEvent(QContextMenuEvent *event)
{
    QWebEngineContextMenuRequest *request = lastContextMenuRequest();
    QWebEnginePage *currentPage = page();

    if (!request || !currentPage) {
        QWebEngineView::contextMenuEvent(event);
        return;
    }

    QMenu menu(this);

    QAction *backAction = currentPage->action(QWebEnginePage::Back);
    if (backAction && backAction->isEnabled()) {
        menu.addAction(backAction);
    }

    QAction *forwardAction = currentPage->action(QWebEnginePage::Forward);
    if (forwardAction && forwardAction->isEnabled()) {
        menu.addAction(forwardAction);
    }

    QAction *reloadAction = currentPage->action(QWebEnginePage::Reload);
    if (reloadAction && reloadAction->isEnabled()) {
        menu.addAction(reloadAction);
    }
    
    bool hasStandardActions = !menu.isEmpty();
    bool willHaveCustomLinkAction = !request->linkUrl().isEmpty();
    bool willHaveCustomCopyAction = !request->selectedText().isEmpty();

    if (hasStandardActions && (willHaveCustomLinkAction || willHaveCustomCopyAction)) {
        menu.addSeparator();
    }

    if (willHaveCustomLinkAction) {
        QUrl urlToOpen = request->linkUrl();
        menu.addAction(tr("Open Link in External Browser"), [urlToOpen]() {
            QDesktopServices::openUrl(urlToOpen);
        });
    }

    if (willHaveCustomCopyAction) {
        QString textToCopy = request->selectedText();
        menu.addAction(tr("Copy"), [textToCopy]() {
            QApplication::clipboard()->setText(textToCopy);
        });
    }

    QAction *viewSourceAction = currentPage->action(QWebEnginePage::ViewSource);
    if (viewSourceAction && viewSourceAction->isEnabled()) {
        if (!menu.isEmpty() && (willHaveCustomLinkAction || willHaveCustomCopyAction || hasStandardActions) ) {
             menu.addSeparator();
        }
        menu.addAction(viewSourceAction);
    }

    // Standard action for "Inspect Element"
    QAction *inspectElementAction = currentPage->action(QWebEnginePage::InspectElement);
    if (inspectElementAction && inspectElementAction->isEnabled()) {
        // Add separator if other items exist and this is not the first item in this block
        if (!menu.isEmpty() && (willHaveCustomLinkAction || willHaveCustomCopyAction || hasStandardActions || (viewSourceAction && viewSourceAction->isEnabled())) ) {
            menu.addSeparator(); 
        }
        menu.addAction(inspectElementAction);
    }

    if (!menu.isEmpty()) {
        menu.exec(event->globalPos());
    } else {
        QWebEngineView::contextMenuEvent(event);
    }
}

QWebEngineView* MyWebView::createWindow(QWebEnginePage::WebWindowType type)
{
    qInfo() << "MyWebView::createWindow called with type:" << static_cast<int>(type);

    if (type == QWebEnginePage::WebBrowserTab || type == QWebEnginePage::WebBrowserWindow) {
        qInfo() << "createWindow: Creating a new MyWebView for WebBrowserTab/WebBrowserWindow.";

        QMainWindow *sourceWindow = new QMainWindow(); 
        MyWebView *newView = new MyWebView(sourceWindow); 
        
        sourceWindow->setCentralWidget(newView);
        sourceWindow->setWindowTitle(tr("View Source")); 
        sourceWindow->setAttribute(Qt::WA_DeleteOnClose); 
        sourceWindow->resize(800, 600); 
        sourceWindow->show();

        return newView;
    }

    qInfo() << "createWindow: Not creating a view for type:" << static_cast<int>(type);
    return nullptr;
}