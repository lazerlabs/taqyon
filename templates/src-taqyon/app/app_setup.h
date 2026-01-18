#ifndef APP_SETUP_H
#define APP_SETUP_H

#include <QString>
#include <QUrl>
#include <QCommandLineParser>
#include <QFile>

struct AppOptions {
    bool verbose;
    QString logFilePath;
    QString devServerUrl;
    QString frontendPath;
    QUrl frontendUrl;
};

void setupCommandLineParser(QCommandLineParser &parser);
AppOptions parseCommandLine(QCommandLineParser &parser);
void setupLogging(const AppOptions &options, QFile *&logFile);
QUrl resolveFrontendUrl(const QCommandLineParser &parser);

#endif // APP_SETUP_H