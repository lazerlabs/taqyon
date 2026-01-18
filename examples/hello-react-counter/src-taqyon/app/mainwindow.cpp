#include "mainwindow.h"
#include "mywebview.h"
#include <QMenuBar>
#include <QMenu>
#include <QAction>
#include <QMessageBox>
#include <QApplication>

MainWindow::MainWindow(MyWebView *webView, QWidget *parent)
    : QMainWindow(parent), m_webView(webView), m_trayIcon(nullptr)
{
    setWindowTitle(QCoreApplication::applicationName());
    setCentralWidget(m_webView);

    setupMenuBar();
    setupTrayIcon();
}

MainWindow::~MainWindow() {
    if (m_trayIcon) {
        m_trayIcon->hide();
        delete m_trayIcon;
    }
}

void MainWindow::setupMenuBar() {
    QMenu *helpMenu = menuBar()->addMenu("&Help");
    QAction *aboutAction = helpMenu->addAction("&About");
    connect(aboutAction, &QAction::triggered, this, &MainWindow::showAboutDialog);
}

void MainWindow::setupTrayIcon() {
    if (!QSystemTrayIcon::isSystemTrayAvailable()) {
        return;
    }

    m_trayIcon = new QSystemTrayIcon(this);
    m_trayIcon->setIcon(windowIcon());

    QMenu *trayMenu = new QMenu(this);
    QAction *showAction = trayMenu->addAction("Show");
    QAction *quitAction = trayMenu->addAction("Quit");
    connect(showAction, &QAction::triggered, this, &MainWindow::showWindow);
    connect(quitAction, &QAction::triggered, this, &MainWindow::quitApp);

    m_trayIcon->setContextMenu(trayMenu);
    connect(m_trayIcon, &QSystemTrayIcon::activated, this, &MainWindow::trayIconActivated);
    m_trayIcon->show();
}

void MainWindow::showAboutDialog() {
    QMessageBox::about(this, "About", "Taqyon example app.");
}

void MainWindow::trayIconActivated(QSystemTrayIcon::ActivationReason reason) {
    if (reason == QSystemTrayIcon::Trigger) {
        showWindow();
    }
}

void MainWindow::showWindow() {
    show();
    raise();
    activateWindow();
}

void MainWindow::quitApp() {
    QApplication::quit();
}

