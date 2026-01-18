#include <QApplication>
#include <QCommandLineParser>
#include <QWebEngineProfile>
#include <QWebEngineSettings>
#include <QWebChannel>
#include <QFile>
#include <QFileInfo>
#include <QDebug>
#include "mywebview.h"
#include "mywebpage.h"
#include "../backend/backendobject.h"
#include "mainwindow.h"
#include "app_setup.h"

// Custom message handler for logging (as before)
void messageHandler(QtMsgType type, const QMessageLogContext &context, const QString &msg) {
    QString logMessage;
    switch (type) {
    case QtDebugMsg:    logMessage = QString("Debug: %1").arg(msg); break;
    case QtInfoMsg:     logMessage = QString("Info: %1").arg(msg); break;
    case QtWarningMsg:  logMessage = QString("Warning: %1").arg(msg); break;
    case QtCriticalMsg: logMessage = QString("Critical: %1").arg(msg); break;
    case QtFatalMsg:    logMessage = QString("Fatal: %1").arg(msg); break;
    }
    fprintf(stderr, "%s\n", qPrintable(logMessage));
}

int main(int argc, char *argv[]) {
    // Set application info
    QString appName = QFileInfo(argv[0]).fileName();
    QCoreApplication::setApplicationName(appName);
    QCoreApplication::setOrganizationName("Taqyon");
    QCoreApplication::setApplicationVersion("1.0.0");

    QApplication app(argc, argv);

    // Command-line parser and options
    QCommandLineParser parser;
    setupCommandLineParser(parser);
    parser.process(QCoreApplication::arguments());
    AppOptions options = parseCommandLine(parser);

    // Logging
    if (options.verbose) {
        qInstallMessageHandler(messageHandler);
        qInfo() << "Verbose mode enabled";
        qInfo() << "Application directory:" << QCoreApplication::applicationDirPath();
    }
    QFile *logFile = nullptr;
    setupLogging(options, logFile);

    // Web view and page
    MyWebView *webView = new MyWebView();
    MyWebPage *webPage = new MyWebPage(QWebEngineProfile::defaultProfile(), webView);
    webView->setPage(webPage);

    // Web engine settings
    webPage->settings()->setAttribute(QWebEngineSettings::JavascriptEnabled, true);
    webPage->settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessFileUrls, true);
    webPage->settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessRemoteUrls, true);
    webPage->settings()->setAttribute(QWebEngineSettings::AllowRunningInsecureContent, true);

    // Web channel and backend
    QWebChannel channel;
    BackendObject backend;
    if (options.verbose) {
        QObject::connect(&backend, &BackendObject::countChanged, [](int count) {
            qInfo() << "Backend count changed to: " << count;
        });
    }
    channel.registerObject(QStringLiteral("backend"), &backend);
    webPage->setWebChannel(&channel);

    // Frontend URL
    QUrl frontendUrl = resolveFrontendUrl(parser);
    if (!frontendUrl.isValid()) {
        return 1;
    }
    webView->setUrl(frontendUrl);

    // Main window with menu bar and tray icon
    MainWindow mainWindow(webView);
    mainWindow.show();

    int result = app.exec();

    if (logFile) {
        logFile->close();
        delete logFile;
    }
    return result;
}