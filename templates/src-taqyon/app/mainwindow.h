#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QSystemTrayIcon>
#include <QAction>
#include <QMenu>

class MyWebView;

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(MyWebView *webView, QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void showAboutDialog();
    void showMainWindow();
    void quitApp();

private:
    void setupMenuBar();
    void setupTrayIcon();

    QSystemTrayIcon *trayIcon;
    QAction *showAction;
    QAction *quitAction;
    QMenu *trayMenu;
};

#endif // MAINWINDOW_H