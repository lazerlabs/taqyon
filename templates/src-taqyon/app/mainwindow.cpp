#include "mainwindow.h"
#include "mywebview.h"
#include <QMenuBar>
#include <QMessageBox>
#include <QApplication>
#include <QIcon>

MainWindow::MainWindow(MyWebView *webView, QWidget *parent)
    : QMainWindow(parent), trayIcon(nullptr), showAction(nullptr), quitAction(nullptr), trayMenu(nullptr)
{
    setWindowTitle("Taqyon App");
    resize(1200, 800);
    setCentralWidget(webView);

    setupMenuBar();
    setupTrayIcon();
}

MainWindow::~MainWindow()
{
    if (trayIcon) {
        trayIcon->hide();
        delete trayIcon;
    }
    if (trayMenu) delete trayMenu;
    // Actions are deleted by trayMenu
}

void MainWindow::setupMenuBar()
{
    QMenuBar *menuBar = this->menuBar();
    QMenu *helpMenu = menuBar->addMenu(tr("&Help"));

    QAction *aboutAction = new QAction(tr("&About"), this);
    connect(aboutAction, &QAction::triggered, this, &MainWindow::showAboutDialog);
    helpMenu->addAction(aboutAction);
}

void MainWindow::setupTrayIcon()
{
    trayIcon = new QSystemTrayIcon(this);

    // Use a generic icon (Qt's standard "application" icon)
    QIcon icon = QIcon::fromTheme("application-exit", QIcon(":/qt-project.org/logos/qt-logo.png"));
    trayIcon->setIcon(icon);
    trayIcon->setToolTip("Taqyon App");

    trayMenu = new QMenu(this);

    showAction = new QAction(tr("Show"), this);
    connect(showAction, &QAction::triggered, this, &MainWindow::showMainWindow);
    trayMenu->addAction(showAction);

    quitAction = new QAction(tr("Quit"), this);
    connect(quitAction, &QAction::triggered, this, &MainWindow::quitApp);
    trayMenu->addAction(quitAction);

    trayIcon->setContextMenu(trayMenu);

    connect(trayIcon, &QSystemTrayIcon::activated, this, [this](QSystemTrayIcon::ActivationReason reason) {
        if (reason == QSystemTrayIcon::Trigger || reason == QSystemTrayIcon::DoubleClick) {
            showMainWindow();
        }
    });

    trayIcon->show();
}

void MainWindow::showAboutDialog()
{
    QMessageBox::about(this, tr("About Taqyon App"),
        tr("<b>Taqyon App</b><br>Version 1.0.0<br><br>A Qt-based desktop application template."));
}

void MainWindow::showMainWindow()
{
    this->showNormal();
    this->raise();
    this->activateWindow();
}

void MainWindow::quitApp()
{
    QApplication::quit();
}